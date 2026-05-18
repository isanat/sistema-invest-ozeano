import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { affiliateWithdrawalSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = affiliateWithdrawalSchema.parse(body);

    // Get config
    const configKeys = ['min_affiliate_withdrawal', 'affiliate_withdrawal_fee_pct'];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const minWithdrawal = d(configMap.min_affiliate_withdrawal) || 10;
    const feePct = d(configMap.affiliate_withdrawal_fee_pct) || 0;

    if (data.amount < minWithdrawal) {
      return apiError(`Saque mínimo de afiliado: ${dusdt(minWithdrawal)} USDT`);
    }

    // Use transaction for atomicity with row lock
    const result = await db.$transaction(async (tx) => {
      // SQLite: serialized transactions provide sufficient concurrency protection

      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('User not found');

      const currentBalance = d(user.affiliateBalance);

      if (currentBalance < data.amount) {
        throw new Error(`Saldo de afiliado insuficiente. Disponível: ${dusdt(currentBalance)} USDT`);
      }

      // Calculate fee
      const fee = data.amount * (feePct / 100);
      const netAmount = data.amount - fee;

      // Deduct from affiliate balance atomically (SQLite-compatible)
      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST(CAST("affiliateBalance" AS REAL) - ${data.amount} AS TEXT) WHERE id = ${session.userId} AND CAST("affiliateBalance" AS REAL) >= ${data.amount}`;
      // Verify the deduction actually happened
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.affiliateBalance) === currentBalance) {
        throw new Error('Saldo de afiliado insuficiente');
      }

      // Create affiliate withdrawal record
      const withdrawal = await tx.affiliateWithdrawal.create({
        data: {
          userId: session.userId,
          amount: ds(data.amount),
          fee: ds(fee),
          netAmount: ds(netAmount),
          method: data.method,
          address: data.method === 'usdt_trc20' ? data.destination : null,
          pixKey: data.method === 'pix' ? data.destination : null,
          status: 'pending',
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'withdrawal',
          amount: ds(data.amount),
          status: 'pending',
          description: `Saque comissão afiliado - ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()}${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          referenceId: withdrawal.id,
          referenceType: 'AffiliateWithdrawal',
        },
      });

      return { withdrawal, fee, netAmount };
    });

    return apiSuccess({
      withdrawal: result.withdrawal,
      fee: dusdt(result.fee),
      netAmount: dusdt(result.netAmount),
      message: 'Solicitação de saque de comissões criada. Aguarde o processamento.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
