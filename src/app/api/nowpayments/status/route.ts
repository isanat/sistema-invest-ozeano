import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  getPaymentStatus,
  getPayoutStatus,
  isPaymentFinal,
  isPayoutFinal,
} from '@/lib/nowpayments';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const depositId = searchParams.get('depositId');
    const payoutId = searchParams.get('payoutId');

    if (!depositId && !payoutId) {
      return apiError('Forneça depositId ou payoutId');
    }

    const npConfigured = isNowPaymentsConfigured();

    // Check deposit status
    if (depositId) {
      const deposit = await db.nowPaymentsDeposit.findUnique({
        where: { id: depositId },
      });

      if (!deposit) {
        return apiError('Depósito não encontrado', 404);
      }

      let remoteStatus: string | null = null;

      // Fetch current status from NowPayments if configured and payment ID exists
      if (npConfigured && deposit.nowpaymentsPaymentId) {
        try {
          const paymentInfo = await getPaymentStatus(deposit.nowpaymentsPaymentId);
          remoteStatus = paymentInfo.payment_status;

          // Update local DB if status changed
          if (remoteStatus && remoteStatus !== deposit.paymentStatus) {
            const updateData: Record<string, unknown> = {
              paymentStatus: remoteStatus,
              updatedAt: new Date(),
            };

            if (paymentInfo.actually_paid) {
              updateData.actuallyPaid = ds(d(paymentInfo.actually_paid));
            }
            if (paymentInfo.outcome_amount) {
              updateData.outcomeAmount = ds(d(paymentInfo.outcome_amount));
            }
            if (paymentInfo.outcome_currency) {
              updateData.outcomeCurrency = paymentInfo.outcome_currency;
            }

            await db.nowPaymentsDeposit.update({
              where: { id: deposit.id },
              data: updateData,
            });

            // Refresh deposit data
            Object.assign(deposit, updateData);
          }
        } catch (err) {
          console.error('[NowPayments Status] Failed to fetch payment status:', err);
          // Return local status as fallback
        }
      }

      return apiSuccess({
        type: 'deposit',
        deposit: {
          id: deposit.id,
          paymentId: deposit.nowpaymentsPaymentId,
          priceAmount: deposit.priceAmount,
          payCurrency: deposit.payCurrency,
          payAddress: deposit.payAddress,
          paymentStatus: deposit.paymentStatus,
          remoteStatus,
          splitProcessed: deposit.splitProcessed,
          splitAmount: deposit.splitAmount,
          investmentId: deposit.investmentId,
          isFinal: isPaymentFinal(deposit.paymentStatus),
          createdAt: deposit.createdAt,
          confirmedAt: deposit.confirmedAt,
        },
      });
    }

    // Check payout status
    if (payoutId) {
      const payout = await db.nowPaymentsPayout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        return apiError('Saque não encontrado', 404);
      }

      let remoteStatus: string | null = null;

      // Fetch current status from NowPayments if configured and batch ID exists
      if (npConfigured && payout.nowpaymentsBatchId) {
        try {
          const payoutInfo = await getPayoutStatus(payout.nowpaymentsBatchId) as Record<string, unknown>;
          // Extract status from payout response
          const withdrawals = payoutInfo.withdrawals as Array<{ status: string }> | undefined;
          if (withdrawals && withdrawals.length > 0) {
            remoteStatus = withdrawals[0].status;
          }

          // Update local DB if status changed
          if (remoteStatus && remoteStatus !== payout.payoutStatus) {
            await db.nowPaymentsPayout.update({
              where: { id: payout.id },
              data: {
                payoutStatus: remoteStatus,
                updatedAt: new Date(),
              },
            });

            payout.payoutStatus = remoteStatus;
          }
        } catch (err) {
          console.error('[NowPayments Status] Failed to fetch payout status:', err);
          // Return local status as fallback
        }
      }

      return apiSuccess({
        type: 'payout',
        payout: {
          id: payout.id,
          batchId: payout.nowpaymentsBatchId,
          amount: payout.amount,
          currency: payout.currency,
          destinationAddress: payout.destinationAddress,
          payoutStatus: payout.payoutStatus,
          remoteStatus,
          fee: payout.fee,
          netAmount: payout.netAmount,
          txHash: payout.txHash,
          investmentId: payout.investmentId,
          isFinal: isPayoutFinal(payout.payoutStatus),
          createdAt: payout.createdAt,
          completedAt: payout.completedAt,
        },
      });
    }

    // Should not reach here
    return apiError('Parâmetro inválido');
  } catch (error) {
    return handleApiError(error);
  }
}
