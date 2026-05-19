import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { withdrawalSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = withdrawalSchema.parse(body);

    // Get withdrawal config
    const configKeys = ['min_withdrawal_usdt', 'max_withdrawal_usdt', 'withdrawal_fee_pct'];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const minWithdrawal = d(configMap.min_withdrawal_usdt) || 10;
    const maxWithdrawal = d(configMap.max_withdrawal_usdt) || 50000;
    const feePct = d(configMap.withdrawal_fee_pct) || 0;

    if (data.amount < minWithdrawal) {
      return apiError(`Saque mínimo: ${dusdt(minWithdrawal)} USDT`);
    }

    if (data.amount > maxWithdrawal) {
      return apiError(`Saque máximo: ${dusdt(maxWithdrawal)} USDT`);
    }

    // ========== VOUCHER WITHDRAWAL LOCK CHECK ==========
    // Check if user has active vouchers with withdrawal restrictions
    const activeVouchers = await db.voucher.findMany({
      where: { userId: session.userId, status: 'active' },
    });

    if (activeVouchers.length > 0) {
      // Calculate the maximum withdrawal unlock percentage from all active vouchers
      // Use the HIGHEST unlock percentage (most permissive)
      let maxUnlockPct = 0;
      for (const v of activeVouchers) {
        const unlockPct = d(v.withdrawalUnlockPct);
        if (unlockPct > maxUnlockPct) maxUnlockPct = unlockPct;
      }

      // If unlock is 0%, user cannot withdraw at all
      if (maxUnlockPct === 0) {
        return apiError('Seus saques estão bloqueados. Você tem vouchers ativos com metas pendentes. Cumpra as metas para desbloquear gradualmente seus saques.');
      }

      // If unlock is less than 100%, limit the withdrawal amount
      if (maxUnlockPct < 100) {
        // Fetch user balance for the check
        const userForCheck = await db.user.findUnique({ where: { id: session.userId } });
        if (userForCheck) {
          const maxWithdrawable = d(userForCheck.balance) * (maxUnlockPct / 100);
          if (data.amount > maxWithdrawable) {
            return apiError(`Com base no desbloqueio gradual (${maxUnlockPct}%), você pode sacar no máximo ${dusdt(maxWithdrawable)} USDT dos seus ${dusdt(d(userForCheck.balance))} USDT de saldo. Continue cumprindo as metas para desbloquear mais.`);
          }
        }
      }
    }

    // Also check if user has a completed voucher but their unlock hasn't been processed yet
    const completedVouchers = await db.voucher.findMany({
      where: { userId: session.userId, status: 'completed', withdrawalUnlockPct: '100' },
    });
    // Completed vouchers with 100% unlock don't restrict withdrawals

    // Use transaction for atomicity - deduct balance immediately with row lock
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent balance modifications
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;

      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('User not found');

      const currentBalance = d(user.balance);

      if (currentBalance < data.amount) {
        throw new Error('Saldo insuficiente');
      }

      // Calculate fee
      const fee = data.amount * (feePct / 100);
      const netAmount = data.amount - fee;

      // Deduct balance atomically using SQL (PostgreSQL)
      await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) - ${data.amount})::text WHERE id = ${session.userId} AND CAST(balance AS NUMERIC) >= ${data.amount}`;
      // Verify the deduction actually happened (balance was sufficient)
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.balance) === currentBalance) {
        throw new Error('Saldo insuficiente');
      }

      // Get USDT/BRL rate
      const usdtBrlRate = await getUSDTBRLRate();
      const brlAmount = data.method === 'pix' ? data.amount * usdtBrlRate : null;

      // Create investment record (withdrawal)
      const investment = await tx.investment.create({
        data: {
          userId: session.userId,
          amount: ds(data.amount),
          brlAmount: brlAmount ? ds(brlAmount) : null,
          usdtRate: ds(usdtBrlRate),
          type: 'withdrawal',
          method: data.method,
          network: data.method === 'usdt_trc20' ? 'TRC20' : null,
          status: 'pending',
          destination: data.destination,
          description: `Saque ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()} - ${dusdt(data.amount)} USDT${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          adminNotes: fee > 0 ? `Taxa: ${dusdt(fee)} USDT (${feePct}%). Valor líquido: ${dusdt(netAmount)} USDT` : null,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'withdrawal',
          amount: ds(data.amount),
          brlAmount: brlAmount ? ds(brlAmount) : null,
          usdtRate: ds(usdtBrlRate),
          status: 'pending',
          description: `Saque solicitado - ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()}${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          referenceId: investment.id,
          referenceType: 'Investment',
        },
      });

      return { investment, fee, netAmount };
    });

    return apiSuccess({
      withdrawal: result.investment,
      fee: dusdt(result.fee),
      netAmount: dusdt(result.netAmount),
      message: 'Solicitação de saque criada. Aguarde o processamento.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
