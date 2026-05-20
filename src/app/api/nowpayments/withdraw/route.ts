import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  createPayout,
  calculatePayoutFee,
  toNowPaymentsCurrency,
  type CreatePayoutResponse,
} from '@/lib/nowpayments';
import { getUSDTBRLRate } from '@/lib/market-data';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const amount = Number(body.amount);
    const currency = String(body.currency || 'usdttrc20');
    const destinationAddress = String(body.destination_address || '').trim();

    if (!amount || amount <= 0) {
      return apiError('Valor deve ser positivo');
    }

    if (!destinationAddress) {
      return apiError('Endereço de destino é obrigatório');
    }

    // Get withdrawal config
    const configKeys = [
      'min_withdrawal_usdt',
      'max_withdrawal_usdt',
      'withdrawal_fee_pct',
      'nowpayments_enabled',
    ];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const minWithdrawal = d(configMap.min_withdrawal_usdt) || 10;
    const maxWithdrawal = d(configMap.max_withdrawal_usdt) || 50000;
    const feePct = d(configMap.withdrawal_fee_pct) || 0;

    if (amount < minWithdrawal) {
      return apiError(`Saque mínimo: ${dusdt(minWithdrawal)} USDT`);
    }
    if (amount > maxWithdrawal) {
      return apiError(`Saque máximo: ${dusdt(maxWithdrawal)} USDT`);
    }

    // Calculate fee
    const fee = amount * (feePct / 100);
    const netAmount = amount - fee;
    const npCurrency = toNowPaymentsCurrency(currency);

    // Try to get NowPayments payout fee
    let npFee = 0;
    const npConfigured = await isNowPaymentsConfigured();
    if (npConfigured) {
      try {
        const feeResult = await calculatePayoutFee(npCurrency, netAmount);
        npFee = feeResult.fee || 0;
      } catch (err) {
        console.error('[NowPayments] Failed to calculate payout fee:', err);
        // Continue without NP fee
      }
    }

    // Atomic transaction: deduct balance and create records
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('Usuário não encontrado');

      const currentBalance = d(user.balance);
      if (currentBalance < amount) {
        throw new Error('Saldo insuficiente');
      }

      // Deduct balance atomically
      await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) - ${amount})::text WHERE id = ${session.userId} AND CAST(balance AS NUMERIC) >= ${amount}`;

      // Verify deduction
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.balance) === currentBalance) {
        throw new Error('Saldo insuficiente');
      }

      // Get USDT/BRL rate
      const usdtBrlRate = await getUSDTBRLRate();
      const brlAmount = amount * usdtBrlRate;

      // Create Deposit record (withdrawal)
      const depositRecord = await tx.deposit.create({
        data: {
          userId: session.userId,
          amount: ds(amount),
          brlAmount: ds(brlAmount),
          usdtRate: ds(usdtBrlRate),
          type: 'withdrawal',
          method: currency,
          network: currency === 'usdttrc20' ? 'TRC20' : null,
          status: 'pending',
          destination: destinationAddress,
          description: `Saque NowPayments ${currency.toUpperCase()} - ${dusdt(amount)} USDT${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          adminNotes: fee > 0 ? `Taxa: ${dusdt(fee)} USDT (${feePct}%). Valor líquido: ${dusdt(netAmount)} USDT` : null,
        },
      });

      // Create Transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'withdrawal',
          amount: ds(amount),
          brlAmount: ds(brlAmount),
          usdtRate: ds(usdtBrlRate),
          status: 'pending',
          description: `Saque solicitado - NowPayments ${currency.toUpperCase()}${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          referenceId: depositRecord.id,
          referenceType: 'Deposit',
        },
      });

      // Create NowPaymentsPayout record
      const payoutRecord = await tx.nowPaymentsPayout.create({
        data: {
          userId: session.userId,
          amount: ds(netAmount),
          currency: npCurrency,
          destinationAddress,
          payoutStatus: 'CREATED',
          fee: ds(fee + npFee),
          netAmount: ds(netAmount - npFee),
          payoutDescription: `PLATAFORMA ROI Withdrawal - ${amount} USDT`,
          depositId: depositRecord.id,
        },
      });

      return { depositRecord, payoutRecord, fee, netAmount, npFee };
    });

    // Attempt to create NowPayments payout (outside transaction to avoid blocking)
    let payout: CreatePayoutResponse | null = null;
    if (npConfigured) {
      try {
        const cryptoAmount = result.netAmount - result.npFee;
        payout = await createPayout(
          [{
            address: destinationAddress,
            currency: npCurrency,
            amount: Math.max(0.01, cryptoAmount), // Ensure minimum amount
            ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
            payout_description: `PLATAFORMA ROI Withdrawal - ${amount} USDT`,
          }],
          `Withdrawal for user ${session.userId}`
        );

        // Update payout record with NowPayments IDs
        const batchId = payout.id;
        const withdrawalId = payout.withdrawals?.[0]?.id;

        await db.nowPaymentsPayout.update({
          where: { id: result.payoutRecord.id },
          data: {
            nowpaymentsBatchId: batchId ? String(batchId) : null,
            nowpaymentsWithdrawalId: withdrawalId ? String(withdrawalId) : null,
            payoutStatus: payout.withdrawals?.[0]?.status || 'WAITING',
          },
        });
      } catch (err) {
        console.error('[NowPayments] Failed to create payout:', err);
        // Payout remains as CREATED status - will be processed manually
      }
    }

    return apiSuccess({
      withdrawal: result.depositRecord,
      payout: result.payoutRecord,
      fee: dusdt(result.fee),
      netAmount: dusdt(result.netAmount),
      npFee: dusdt(result.npFee),
      nowpaymentsStatus: payout ? 'submitted' : (npConfigured ? 'failed_submission' : 'manual'),
      message: payout
        ? 'Saque solicitado via NowPayments. Aguarde o processamento.'
        : 'Saque registrado. Aguarde o processamento manual.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
