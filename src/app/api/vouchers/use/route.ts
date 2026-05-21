import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAuth, d, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';

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

    if (new Date(voucher.deadline) < new Date()) {
      return apiError('Voucher expirado (prazo esgotado)');
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

    // Track whether this investment was originally paid from balance (needs refund)
    const wasPaidFromBalance = investment.source === 'deposit';

    // Execute in a transaction for atomicity
    await db.$transaction(async (tx) => {
      // Acquire row lock on Voucher to prevent concurrent usage (BUG #2 fix)
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "Voucher" WHERE id = ${voucherId} FOR UPDATE`;
      }

      // Re-check voucher remaining balance inside lock
      const lockedVoucher = await tx.voucher.findUnique({ where: { id: voucherId } });
      const lockedRemaining = d(lockedVoucher!.amount) - d(lockedVoucher!.usedAmount);
      if (lockedRemaining < amount) {
        throw new BusinessError(`Saldo insuficiente no voucher. Disponível: ${dusdt(lockedRemaining)} USDT`);
      }

      // Acquire row lock on user (PostgreSQL)
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
      }

      // Update voucher usedAmount
      const newUsedAmount = d(lockedVoucher!.usedAmount) + amount;
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

      // Update investment source to 'voucher' so ROI profits are correctly classified
      await tx.investment.update({
        where: { id: investmentId },
        data: { source: 'voucher' },
      });

      if (wasPaidFromBalance) {
        // BUG #3 fix: When changing source from 'deposit' to 'voucher',
        // we must REFUND the balance since the investment was originally paid from balance.
        // The voucher is now paying for it instead.
        // Also reduce totalInvestedFromBalance equivalent: we reduce totalInvested
        // since the breakdown formula uses source='deposit' to calc totalInvestedFromBalance.
        // totalInvested stays the same (investment still exists, just funded by voucher).
        await tx.$executeRaw`UPDATE "User" SET 
          "voucherBalance" = CAST((CAST("voucherBalance" AS NUMERIC) - ${amount}) AS TEXT),
          "balance" = CAST((CAST("balance" AS NUMERIC) + ${amount}) AS TEXT)
          WHERE id = ${session.userId}`;
      } else {
        // Investment was already voucher-funded (shouldn't happen due to existingUsage check, but safety)
        await tx.$executeRaw`UPDATE "User" SET 
          "voucherBalance" = CAST((CAST("voucherBalance" AS NUMERIC) - ${amount}) AS TEXT)
          WHERE id = ${session.userId}`;
      }

      // Verify voucher balance doesn't go negative
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.voucherBalance) < 0) {
        throw new BusinessError('Saldo do voucher ficaria negativo - operação cancelada');
      }
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId: session.userId,
        type: 'investment',
        amount: dusdt(amount),
        status: 'completed',
        description: `Pagamento de investimento com voucher #${voucherId.slice(-8)}${wasPaidFromBalance ? ' (reembolso de saldo)' : ''}`,
        referenceId: investmentId,
        referenceType: 'VoucherUsage',
      },
    });

    // If balance was refunded, also create a transaction record for the refund
    if (wasPaidFromBalance) {
      await db.transaction.create({
        data: {
          userId: session.userId,
          type: 'deposit',
          amount: dusdt(amount),
          status: 'completed',
          description: `Reembolso de saldo — investimento agora pago por voucher #${voucherId.slice(-8)}`,
          referenceId: investmentId,
          referenceType: 'VoucherRefund',
        },
      });
    }

    return apiSuccess({
      message: wasPaidFromBalance
        ? 'Voucher aplicado! Seu saldo foi reembolsado pois o investimento agora é pago pelo voucher.'
        : 'Saldo do voucher utilizado com sucesso!',
      usedAmount: dusdt(amount),
      remainingBalance: dusdt(remainingBalance - amount),
      balanceRefunded: wasPaidFromBalance,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
