import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyNowPaymentsSignature, processPaymentSplits, processPendingSplits } from '@/lib/nowpayments';
import { getTeamBonusPct } from '@/lib/affiliate';

// POST /api/payments/callback - NowPayments callback/webhook handler
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-nowpayments-sig') || '';

    // Parse the body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Get IPN secret for verification
    const ipnSecretConfig = await db.systemConfig.findUnique({
      where: { key: 'nowpayments_ipn_secret' },
    });
    const ipnSecret = ipnSecretConfig?.value || '';

    // Verify signature if IPN secret is configured
    if (ipnSecret && signature) {
      const isValid = verifyNowPaymentsSignature(rawBody, signature, ipnSecret);
      if (!isValid) {
        console.error('NowPayments callback: Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (ipnSecret && !signature) {
      console.error('NowPayments callback: Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Extract payment information
    const paymentId = body.payment_id as string;
    const paymentStatus = body.payment_status as string;
    const payAddress = body.pay_address as string | undefined;
    const payAmount = body.pay_amount as string | undefined;
    const payCurrency = body.pay_currency as string | undefined;
    const outcomeAmount = body.outcome_amount as string | undefined;
    const outcomeCurrency = body.outcome_currency as string | undefined;
    const orderId = body.order_id as string | undefined;
    const priceAmount = body.price_amount as number | undefined;

    if (!paymentId || !paymentStatus) {
      return NextResponse.json(
        { error: 'Missing payment_id or payment_status' },
        { status: 400 }
      );
    }

    // Find the payment in our database by nowpaymentsId
    const payment = await db.payment.findFirst({
      where: { nowpaymentsId: paymentId.toString() },
    });

    if (!payment) {
      // Try to find by orderId (purchaseId)
      const paymentByOrder = orderId
        ? await db.payment.findFirst({
            where: { purchaseId: orderId },
          })
        : null;

      if (!paymentByOrder) {
        console.error(`NowPayments callback: Payment not found for ID ${paymentId}`);
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      // Update the found payment
      return await updatePaymentStatus(paymentByOrder, {
        paymentStatus,
        payAddress,
        payAmount,
        payCurrency,
        outcomeAmount,
        outcomeCurrency,
      });
    }

    return await updatePaymentStatus(payment, {
      paymentStatus,
      payAddress,
      payAmount,
      payCurrency,
      outcomeAmount,
      outcomeCurrency,
    });
  } catch (error) {
    console.error('NowPayments callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updatePaymentStatus(
  payment: {
    id: string;
    userId: string;
    type: string;
    amount: string;
    paymentStatus: string;
  },
  updates: {
    paymentStatus: string;
    payAddress?: string;
    payAmount?: string;
    payCurrency?: string;
    outcomeAmount?: string;
    outcomeCurrency?: string;
  }
): Promise<NextResponse> {
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

  const newStatus = statusMap[updates.paymentStatus] || updates.paymentStatus;
  const finalStates = ['finished', 'failed', 'expired', 'refunded'];
  const isFinal = finalStates.includes(newStatus);

  // Build update data
  const updateData: Record<string, unknown> = {
    paymentStatus: newStatus,
    updatedAt: new Date(),
  };

  if (updates.payAddress) updateData.payAddress = updates.payAddress;
  if (updates.payAmount) updateData.payAmount = updates.payAmount;
  if (updates.payCurrency) updateData.payCurrency = updates.payCurrency;
  if (updates.outcomeAmount) updateData.outcomeAmount = updates.outcomeAmount;
  if (updates.outcomeCurrency) updateData.outcomeCurrency = updates.outcomeCurrency;
  if (isFinal) updateData.confirmedAt = new Date();

  await db.payment.update({
    where: { id: payment.id },
    data: updateData,
  });

  // If deposit is finished, credit user balance and create investment
  if (newStatus === 'finished' && payment.type === 'deposit') {
    await handleDepositConfirmation(payment.id);
  }

  // If withdrawal is finished, update withdrawal status
  if (newStatus === 'finished' && payment.type === 'withdrawal') {
    await db.withdrawal.updateMany({
      where: { userId: payment.userId },
      data: { status: 'processed', processedAt: new Date() },
    });
  }

  // If payment failed/expired for a withdrawal, refund the user
  if ((newStatus === 'failed' || newStatus === 'expired') && payment.type === 'withdrawal') {
    const user = await db.user.findUnique({ where: { id: payment.userId } });
    if (user) {
      const refundAmount = parseFloat(payment.amount);
      const newBalance = (parseFloat(user.balance) + refundAmount).toFixed(8);
      const newTotalWithdrawn = (parseFloat(user.totalWithdrawn) - refundAmount).toFixed(8);

      await db.user.update({
        where: { id: user.id },
        data: {
          balance: newBalance,
          totalWithdrawn: Math.max(0, parseFloat(newTotalWithdrawn)).toFixed(8),
        },
      });

      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'deposit',
          amount: refundAmount.toFixed(8),
          description: `Refund for failed withdrawal`,
          referenceId: payment.id,
          status: 'completed',
        },
      });

      await db.withdrawal.updateMany({
        where: { userId: payment.userId, status: 'pending' },
        data: { status: 'rejected', rejectedReason: 'NowPayments payment failed' },
      });
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}

/**
 * Handle confirmed deposit - credit balance, process commissions
 */
async function handleDepositConfirmation(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.type !== 'deposit') {
    return;
  }

  // Check if we already processed this deposit
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

  // Process payment splits (affiliate commissions, team bonus, platform/trader fees)
  try {
    await processPaymentSplits(paymentId, user.id, amount);
    await processPendingSplits(paymentId);
  } catch (splitError) {
    console.error('Payment split processing error:', splitError);
  }

  // Update team bonus for the user
  try {
    const teamBonusPct = await getTeamBonusPct(user.id);
    await db.user.update({
      where: { id: user.id },
      data: { teamBonusPct: teamBonusPct.toFixed(1) },
    });
  } catch {
    // Ignore
  }
}
