import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get all deposit investments for the user
    const where: any = { userId: session.userId, type: 'deposit' };
    if (status) where.status = status;

    const [investments, total] = await Promise.all([
      db.investment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.investment.count({ where }),
    ]);

    // Get NowPayments deposit details for these investments
    const investmentIds = investments.map((i) => i.id);
    const npDeposits = await db.nowPaymentsDeposit.findMany({
      where: {
        investmentId: { in: investmentIds },
      },
    });

    // Create a map of investmentId -> NowPaymentsDeposit
    const npDepositMap = new Map(npDeposits.map((np) => [np.investmentId, np]));

    // Combine data
    const deposits = investments.map((inv) => {
      const npDeposit = npDepositMap.get(inv.id) || null;
      return {
        ...inv,
        nowpayments: npDeposit
          ? {
              id: npDeposit.id,
              paymentId: npDeposit.nowpaymentsPaymentId,
              payAddress: npDeposit.payAddress,
              payAmount: npDeposit.payAmount,
              payCurrency: npDeposit.payCurrency,
              paymentStatus: npDeposit.paymentStatus,
              actuallyPaid: npDeposit.actuallyPaid,
              outcomeAmount: npDeposit.outcomeAmount,
              splitProcessed: npDeposit.splitProcessed,
              splitAmount: npDeposit.splitAmount,
              splitPct: npDeposit.splitPct,
              expiresAt: npDeposit.expiresAt,
              confirmedAt: npDeposit.confirmedAt,
              orderId: npDeposit.orderId,
            }
          : null,
      };
    });

    // Calculate summary stats
    const allDeposits = await db.investment.findMany({
      where: { userId: session.userId, type: 'deposit' },
      select: { amount: true, status: true },
    });

    const stats = {
      totalDeposited: allDeposits
        .filter((i) => i.status === 'confirmed' || i.status === 'approved')
        .reduce((s, i) => s + d(i.amount), 0),
      pendingAmount: allDeposits
        .filter((i) => i.status === 'pending')
        .reduce((s, i) => s + d(i.amount), 0),
      totalInvoices: allDeposits.length,
      confirmedCount: allDeposits.filter(
        (i) => i.status === 'confirmed' || i.status === 'approved'
      ).length,
      pendingCount: allDeposits.filter((i) => i.status === 'pending').length,
      expiredCount: allDeposits.filter(
        (i) => i.status === 'rejected' || i.status === 'cancelled'
      ).length,
    };

    return apiSuccess({
      deposits,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
