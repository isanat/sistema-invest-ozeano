import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build transaction filter
    const txWhere: any = { userId: session.userId };
    if (type) txWhere.type = type;
    if (startDate || endDate) {
      txWhere.createdAt = {};
      if (startDate) txWhere.createdAt.gte = new Date(startDate);
      if (endDate) txWhere.createdAt.lte = new Date(endDate);
    }

    // Build deposit filter (deposits & withdrawals that may not have transactions yet)
    const depWhere: any = { userId: session.userId };
    if (startDate || endDate) {
      depWhere.createdAt = {};
      if (startDate) depWhere.createdAt.gte = new Date(startDate);
      if (endDate) depWhere.createdAt.lte = new Date(endDate);
    }

    const [transactions, deposits, user] = await Promise.all([
      db.transaction.findMany({
        where: txWhere,
        orderBy: { createdAt: 'desc' },
      }),
      db.deposit.findMany({
        where: depWhere,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.findUnique({
        where: { id: session.userId },
        select: {
          balance: true,
          totalInvested: true,
          totalRoi: true,
          totalWithdrawn: true,
          totalAffiliateEarnings: true,
          affiliateBalance: true,
          totalDeposited: true,
        },
      }),
    ]);

    // Combine into unified statement entries
    type StatementEntry = {
      id: string;
      date: string;
      type: string;
      category: 'income' | 'expense' | 'investment';
      description: string;
      amount: number;
      status: string;
      method?: string;
      network?: string;
      referenceId?: string;
      referenceType?: string;
    };

    const entries: StatementEntry[] = [];

    // Add transaction entries
    for (const tx of transactions) {
      let category: 'income' | 'expense' | 'investment';

      if (tx.type === 'investment') {
        // Investments are a conversion (balance → active plan), NOT a true expense
        category = 'investment';
      } else if (tx.type === 'admin_adjust') {
        // Admin adjustments: positive = income, negative = expense
        // The amount field is always stored as positive (absolute value),
        // so we check the description for the sign indicator.
        // Description format: "Ajuste admin no saldo: +98 USDT" or "Ajuste admin no saldo: -50 USDT"
        // Also: "Ajuste admin no saldo afiliado:" and "Ajuste admin no saldo voucher:"
        const desc = tx.description || '';
        // Match the sign after the colon — "+98" means credit, "-50" means debit
        const signMatch = desc.match(/:\s*([+-])/);
        const isCredit = signMatch ? signMatch[1] === '+' : true; // Default to credit if no sign found
        category = isCredit ? 'income' : 'expense';
      } else {
        const isIncome = [
          'deposit',
          'roi_profit',
          'affiliate_commission',
        ].includes(tx.type);
        category = isIncome ? 'income' : 'expense';
      }

      entries.push({
        id: tx.id,
        date: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt),
        type: tx.type,
        category,
        description: tx.description,
        amount: d(tx.amount),
        status: tx.status,
        referenceId: tx.referenceId || undefined,
        referenceType: tx.referenceType || undefined,
      });
    }

    // Add deposit entries that don't have corresponding transactions yet
    // (pending deposits/withdrawals that haven't been confirmed)
    const txRefIds = new Set(
      transactions.filter((t) => t.referenceId).map((t) => t.referenceId)
    );
    for (const dep of deposits) {
      if (txRefIds.has(dep.id)) continue; // Skip if already in transactions
      const isIncome = dep.type === 'deposit';
      entries.push({
        id: `dep_${dep.id}`,
        date: dep.createdAt instanceof Date ? dep.createdAt.toISOString() : String(dep.createdAt),
        type: isIncome ? 'deposit' : 'withdrawal',
        category: isIncome ? 'income' : 'expense',
        description:
          dep.description ||
          `${isIncome ? 'Depósito' : 'Saque'} - ${dep.method}${dep.network ? ` (${dep.network})` : ''}`,
        amount: d(dep.amount),
        status: dep.status,
        method: dep.method,
        network: dep.network || undefined,
        referenceId: dep.id,
        referenceType: 'Deposit',
      });
    }

    // Sort by date descending
    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate running balance (from oldest to newest)
    // Investments also affect balance (they deduct from available balance)
    const ascending = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate what the balance SHOULD be based on recorded transactions
    let calculatedBalance = 0;
    for (const entry of ascending) {
      if (
        entry.status === 'completed' ||
        entry.status === 'confirmed' ||
        entry.status === 'approved'
      ) {
        if (entry.category === 'income') {
          calculatedBalance += entry.amount;
        } else {
          // Both 'expense' and 'investment' deduct from balance
          calculatedBalance -= entry.amount;
        }
      }
    }

    // The real balance comes from the User record.
    // If calculatedBalance != real balance, there's a "gap" from missing transactions
    // (e.g., admin set balance directly, or deposit wasn't recorded as a transaction).
    // We handle this by starting the running balance with an offset.
    const realBalance = d(user?.balance || '0');
    const gap = realBalance - calculatedBalance;

    // Re-calculate running balance with the gap offset
    let balance = gap; // Start with gap to account for missing income
    const balanceMap = new Map<string, number>();
    for (const entry of ascending) {
      if (
        entry.status === 'completed' ||
        entry.status === 'confirmed' ||
        entry.status === 'approved'
      ) {
        if (entry.category === 'income') {
          balance += entry.amount;
        } else {
          // Both 'expense' and 'investment' deduct from balance
          balance -= entry.amount;
        }
      }
      balanceMap.set(entry.id, balance);
    }

    // Add runningBalance to entries
    const statementWithBalance = entries.map((e) => ({
      ...e,
      runningBalance: balanceMap.get(e.id) || 0,
    }));

    // Calculate summary
    // Income: deposits + ROI profits + affiliate commissions + positive admin adjustments
    const totalIncome = entries
      .filter(
        (e) =>
          e.category === 'income' &&
          (e.status === 'completed' ||
            e.status === 'confirmed' ||
            e.status === 'approved')
      )
      .reduce((s, e) => s + e.amount, 0);

    // Expenses: only real money OUT of the platform (withdrawals, negative admin adjusts)
    const totalExpense = entries
      .filter(
        (e) =>
          e.category === 'expense' &&
          (e.status === 'completed' ||
            e.status === 'confirmed' ||
            e.status === 'approved')
      )
      .reduce((s, e) => s + e.amount, 0);

    // Investments: balance converted to active plans (NOT lost money)
    const totalInvestedFromEntries = entries
      .filter(
        (e) =>
          e.category === 'investment' &&
          (e.status === 'completed' ||
            e.status === 'confirmed' ||
            e.status === 'approved')
      )
      .reduce((s, e) => s + e.amount, 0);

    const summary = {
      currentBalance: realBalance,
      affiliateBalance: d(user?.affiliateBalance || '0'),
      totalIncome,
      totalExpense,
      totalInvestedFromEntries,
      netBalance: totalIncome - totalExpense - totalInvestedFromEntries,
      totalInvested: d(user?.totalInvested || '0'),
      totalDeposited: d(user?.totalDeposited || '0'),
      totalRoi: d(user?.totalRoi || '0'),
      totalWithdrawn: d(user?.totalWithdrawn || '0'),
      totalAffiliateEarnings: d(user?.totalAffiliateEarnings || '0'),
      // Include gap info for debugging/transparency
      balanceGap: gap,
    };

    // Paginate
    const paginatedEntries = statementWithBalance.slice(skip, skip + limit);

    return apiSuccess({
      statement: paginatedEntries,
      summary,
      pagination: {
        page,
        limit,
        total: entries.length,
        totalPages: Math.ceil(entries.length / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
