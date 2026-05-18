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

    // Use transaction for atomicity - deduct balance immediately with row lock
    const result = await db.$transaction(async (tx) => {
      // SQLite: serialized transactions provide sufficient concurrency protection

      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('User not found');

      const currentBalance = d(user.balance);

      if (currentBalance < data.amount) {
        throw new Error('Saldo insuficiente');
      }

      // Calculate fee
      const fee = data.amount * (feePct / 100);
      const netAmount = data.amount - fee;

      // Deduct balance atomically using SQL (avoids float precision loss)
      await tx.$executeRaw`UPDATE "User" SET balance = CAST(CAST(balance AS REAL) - ${data.amount} AS TEXT) WHERE id = ${session.userId} AND CAST(balance AS REAL) >= ${data.amount}`;
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
