import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getNowPaymentsConfig, getPaymentStatus, processPaymentSplits, processPendingSplits } from '@/lib/nowpayments';
import { getTeamBonusPct } from '@/lib/affiliate';

// GET /api/payments/status/[id] - Check payment status from NowPayments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get payment from DB
    const payment = await db.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (payment.userId !== auth.userId && auth.role !== 'admin' && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If payment is already in a final state, return current status
    const finalStates = ['finished', 'failed', 'expired', 'refunded'];
    if (finalStates.includes(payment.paymentStatus)) {
      return NextResponse.json({
        payment: {
          id: payment.id,
          type: payment.type,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.paymentStatus,
          nowpaymentsId: payment.nowpaymentsId,
          payAddress: payment.payAddress,
          payAmount: payment.payAmount,
          payCurrency: payment.payCurrency,
          outcomeAmount: payment.outcomeAmount,
          outcomeCurrency: payment.outcomeCurrency,
          confirmedAt: payment.confirmedAt,
          createdAt: payment.createdAt,
        },
      });
    }

    // Check NowPayments status if we have a nowpaymentsId
    if (payment.nowpaymentsId) {
      const npConfig = await getNowPaymentsConfig();
      if (npConfig.apiKey) {
        const statusResult = await getPaymentStatus(payment.nowpaymentsId);

        if (statusResult.ok && statusResult.data) {
          const npStatus = statusResult.data.payment_status as string;
          const outcomeAmount = statusResult.data.outcome_amount as string | undefined;
          const outcomeCurrency = statusResult.data.outcome_currency as string | undefined;

          // Map NowPayments status to our status
          const statusMap: Record<string, string> = {
            'waiting': 'waiting',
            'confirming': 'confirming',
            'confirmed': 'confirming',
            'sending': 'sending',
            'partially_paid': 'confirming',
            'finished': 'finished',
            'failed': 'failed',
            'expired': 'expired',
            'refunded': 'refunded',
          };

          const newStatus = statusMap[npStatus] || payment.paymentStatus;
          const isFinal = finalStates.includes(newStatus);

          // Update payment record
          const updateData: Record<string, unknown> = {
            paymentStatus: newStatus,
            updatedAt: new Date(),
          };

          if (outcomeAmount) {
            updateData.outcomeAmount = outcomeAmount;
          }
          if (outcomeCurrency) {
            updateData.outcomeCurrency = outcomeCurrency;
          }
          if (isFinal) {
            updateData.confirmedAt = new Date();
          }

          await db.payment.update({
            where: { id: payment.id },
            data: updateData,
          });

          // If deposit is finished, credit user balance and create investment
          if (newStatus === 'finished' && payment.type === 'deposit') {
            await handleDepositConfirmation(payment.id);
          }

          return NextResponse.json({
            payment: {
              id: payment.id,
              type: payment.type,
              amount: payment.amount,
              currency: payment.currency,
              status: newStatus,
              nowpaymentsId: payment.nowpaymentsId,
              payAddress: payment.payAddress,
              payAmount: payment.payAmount,
              payCurrency: payment.payCurrency,
              outcomeAmount: outcomeAmount || payment.outcomeAmount,
              outcomeCurrency: outcomeCurrency || payment.outcomeCurrency,
              confirmedAt: isFinal ? new Date() : payment.confirmedAt,
              createdAt: payment.createdAt,
            },
            updated: true,
          });
        }
      }
    }

    // Return current DB status if we can't check NowPayments
    return NextResponse.json({
      payment: {
        id: payment.id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.paymentStatus,
        nowpaymentsId: payment.nowpaymentsId,
        payAddress: payment.payAddress,
        payAmount: payment.payAmount,
        payCurrency: payment.payCurrency,
        outcomeAmount: payment.outcomeAmount,
        outcomeCurrency: payment.outcomeCurrency,
        confirmedAt: payment.confirmedAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle confirmed deposit - credit balance, create investment, process commissions
 */
async function handleDepositConfirmation(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.type !== 'deposit') {
    return;
  }

  // Check if we already processed this payment
  const existingTransaction = await db.transaction.findFirst({
    where: {
      referenceId: paymentId,
      type: 'deposit',
      status: 'completed',
    },
  });

  if (existingTransaction) {
    return; // Already processed
  }

  const amount = parseFloat(payment.amount);
  const user = await db.user.findUnique({ where: { id: payment.userId } });
  if (!user) return;

  // Credit user balance
  const newBalance = (parseFloat(user.balance) + amount).toFixed(8);
  const newTotalInvested = (parseFloat(user.totalInvested) + amount).toFixed(8);

  await db.user.update({
    where: { id: user.id },
    data: {
      balance: newBalance,
      totalInvested: newTotalInvested,
      hasInvested: true,
    },
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'deposit',
      amount: amount.toFixed(8),
      description: `Deposit via NowPayments (${payment.currency})`,
      referenceId: paymentId,
      status: 'completed',
    },
  });

  // Process payment splits (affiliate commissions, team bonus, fees)
  try {
    await processPaymentSplits(paymentId, user.id, amount);
    await processPendingSplits(paymentId);
  } catch (splitError) {
    console.error('Payment split processing error:', splitError);
    // Don't fail the deposit if splits fail
  }

  // Update team bonus for the user
  try {
    const teamBonusPct = await getTeamBonusPct(user.id);
    await db.user.update({
      where: { id: user.id },
      data: { teamBonusPct: teamBonusPct.toFixed(1) },
    });
  } catch {
    // Ignore team bonus update errors
  }
}
