import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { investmentId, voucherId, amount: rawAmount } = body;

    if (!investmentId || !voucherId || !rawAmount) {
      return apiError('investmentId, voucherId e amount são obrigatórios');
    }

    const amount = d(rawAmount);
    if (amount <= 0) {
      return apiError('Valor deve ser maior que zero');
    }

    // Validate voucher belongs to user and is active
    const voucher = await db.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      return apiError('Voucher não encontrado', 404);
    }

    if (voucher.userId !== session.userId) {
      return apiError('Este voucher não pertence ao seu usuário', 403);
    }

    if (voucher.status !== 'active') {
      return apiError(`Voucher não está ativo (status: ${voucher.status})`);
    }

    // Check remaining balance
    const voucherAmount = d(voucher.amount);
    const usedAmount = d(voucher.usedAmount);
    const remainingBalance = voucherAmount - usedAmount;

    if (remainingBalance < amount) {
      return apiError(`Saldo insuficiente no voucher. Disponível: ${dusdt(remainingBalance)} USDT, Solicitado: ${dusdt(amount)} USDT`);
    }

    // Validate investment belongs to user
    const investment = await db.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return apiError('Investimento não encontrado', 404);
    }

    if (investment.userId !== session.userId) {
      return apiError('Este investimento não pertence ao seu usuário', 403);
    }

    // Verify amount matches investment price
    const investmentAmount = d(investment.amount);
    if (amount !== investmentAmount) {
      return apiError(`Valor não corresponde ao preço do investimento. Investimento: ${dusdt(investmentAmount)} USDT, Informado: ${dusdt(amount)} USDT`);
    }

    // Check if this investment already has a voucher usage
    const existingUsage = await db.voucherUsage.findFirst({
      where: { investmentId },
    });
    if (existingUsage) {
      return apiError('Este investimento já foi pago com um voucher');
    }

    // Execute in a transaction for atomicity
    await db.$transaction(async (tx) => {
      // Acquire row lock on user (PostgreSQL)
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;

      // Update voucher usedAmount
      const newUsedAmount = usedAmount + amount;
      await tx.voucher.update({
        where: { id: voucherId },
        data: {
          usedAmount: dusdt(newUsedAmount),
        },
      });

      // Create VoucherUsage record
      await tx.voucherUsage.create({
        data: {
          voucherId,
          investmentId,
          amount: dusdt(amount),
        },
      });

      // Subtract from user's voucherBalance
      await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = (CAST("voucherBalance" AS NUMERIC) - ${amount})::text WHERE id = ${session.userId}`;

      // Verify voucher balance doesn't go negative
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.voucherBalance) < 0) {
        throw new Error('Saldo do voucher ficaria negativo - operação cancelada');
      }
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId: session.userId,
        type: 'investment',
        amount: dusdt(amount),
        status: 'completed',
        description: `Pagamento de investimento com voucher #${voucherId.slice(-8)}`,
        referenceId: investmentId,
        referenceType: 'VoucherUsage',
      },
    });

    return apiSuccess({
      message: 'Saldo do voucher utilizado com sucesso!',
      usedAmount: dusdt(amount),
      remainingBalance: dusdt(remainingBalance - amount),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
