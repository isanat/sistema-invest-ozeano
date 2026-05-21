import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { d, ds, dusdt } from '@/lib/auth';
import {
  verifyWebhookSignature,
  isPaymentFinal,
  isPaymentSuccessful,
  isPayoutFinal,
  createPayout,
  writeOffFromSubPartner,
  toNowPaymentsCurrency,
} from '@/lib/nowpayments';

export async function POST(request: NextRequest) {
  // NO auth required — webhooks come from NowPayments servers
  const startTime = Date.now();

  try {
    const bodyText = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Get the signature header
    const signature = request.headers.get('x-nowpayments-sig') || '';

    // Verify webhook signature
    const verification = await verifyWebhookSignature(body, signature);

    // Extract key fields from webhook payload
    const paymentId = body.payment_id ? String(body.payment_id) : null;
    const payoutId = body.payout_id ? String(body.payout_id) : null;
    const eventType = body.type || (paymentId ? 'payment_status_changed' : payoutId ? 'payout_status_changed' : 'unknown');
    const paymentStatus = body.payment_status || body.status || '';

    // Log the webhook
    const webhookLog = await db.nowPaymentsWebhookLog.create({
      data: {
        eventType: String(eventType),
        paymentId,
        payoutId,
        payload: bodyText,
        signature,
        signatureValid: verification.valid,
        processed: false,
      },
    });

    // If signature is invalid, reject (but still log)
    if (!verification.valid) {
      console.warn('[NowPayments Webhook] Invalid signature - ignoring payload');
      await db.nowPaymentsWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processingError: 'Invalid signature', processed: true },
      });
      const headers: Record<string, string> = {};
      if (verification.skipped) headers['x-verification-status'] = 'skipped';
      return NextResponse.json({ received: true, warning: 'Invalid signature' }, { status: 200, headers });
    }

    // Process within 3 seconds — return 200 immediately and process in background if needed
    let processingError: string | null = null;

    try {
      if (paymentId && paymentStatus) {
        await processPaymentWebhook(body, paymentId, paymentStatus);
      } else if (payoutId && paymentStatus) {
        await processPayoutWebhook(body, payoutId, paymentStatus);
      } else {
        processingError = 'Unrecognized webhook payload structure';
      }
    } catch (err) {
      console.error('[NowPayments Webhook] Processing error:', err);
      processingError = err instanceof Error ? err.message : 'Unknown processing error';
    }

    // Update webhook log
    await db.nowPaymentsWebhookLog.update({
      where: { id: webhookLog.id },
      data: {
        processed: true,
        processingError,
      },
    });

    // Build response headers (include verification status if skipped)
    const responseHeaders: Record<string, string> = {};
    if (verification.skipped) responseHeaders['x-verification-status'] = 'skipped';

    // Ensure we respond within 3 seconds
    const elapsed = Date.now() - startTime;
    if (elapsed > 2500) {
      console.warn(`[NowPayments Webhook] Processing took ${elapsed}ms`);
    }

    return NextResponse.json({ received: true }, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error('[NowPayments Webhook] Fatal error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// ============================================================================
// PAYMENT WEBHOOK PROCESSING
// ============================================================================

async function processPaymentWebhook(
  body: Record<string, unknown>,
  paymentId: string,
  paymentStatus: string
) {
  // Find the deposit by NowPayments payment ID
  const deposit = await db.nowPaymentsDeposit.findFirst({
    where: { nowpaymentsPaymentId: paymentId },
    include: { user: true },
  });

  if (!deposit) {
    console.warn(`[NowPayments Webhook] No deposit found for payment_id: ${paymentId}`);
    return;
  }

  // Skip if already processed (splitProcessed guards against confirmed→finished double-credit)
  if (deposit.splitProcessed) {
    return;
  }

  // Update deposit status and amounts
  const updateData: Record<string, unknown> = {
    paymentStatus,
    actuallyPaid: body.actually_paid ? ds(d(body.actually_paid)) : deposit.actuallyPaid,
    outcomeAmount: body.outcome_amount ? ds(d(body.outcome_amount)) : deposit.outcomeAmount,
    outcomeCurrency: body.outcome_currency ? String(body.outcome_currency) : deposit.outcomeCurrency,
    updatedAt: new Date(),
  };

  // Process successful/finished payment
  if (isPaymentSuccessful(paymentStatus) || paymentStatus === 'finished') {
    updateData.confirmedAt = new Date();

    const depositAmount = d(body.outcome_amount) || d(deposit.priceAmount);

    // Get split config
    const configKeys = ['nowpayments_split_pct', 'nowpayments_split_wallet'];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    const splitPct = d(configMap.nowpayments_split_pct) || 0;
    const platformWallet = configMap.nowpayments_split_wallet || '';

    let splitAmount = 0;
    let userAmount = depositAmount;

    if (splitPct > 0 && platformWallet && !deposit.splitProcessed) {
      splitAmount = depositAmount * (splitPct / 100);
      userAmount = depositAmount - splitAmount;

      updateData.splitAmount = ds(splitAmount);
      updateData.splitPct = ds(splitPct);
      updateData.splitProcessed = true;

      // Attempt to send split to platform wallet
      try {
        await createPayout([{
          address: platformWallet,
          currency: deposit.payCurrency || 'usdttrc20',
          amount: splitAmount,
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
          payout_description: `Platform split - ${splitPct}% of deposit ${paymentId}`,
        }], `Platform split for deposit ${paymentId}`);
      } catch (err) {
        console.error('[NowPayments Webhook] Failed to send split to platform wallet:', err);
        // Try sub-partner write-off as fallback
        try {
          const subAccount = await db.nowPaymentsSubAccount.findUnique({
            where: { userId: deposit.userId },
          });
          if (subAccount) {
            await writeOffFromSubPartner({
              sub_partner_id: subAccount.nowpaymentsUserId,
              currency: deposit.payCurrency || 'usdttrc20',
              amount: splitAmount,
            });
          }
        } catch (writeOffErr) {
          console.error('[NowPayments Webhook] Sub-partner write-off also failed:', writeOffErr);
        }
      }
    } else if (!deposit.splitProcessed) {
      userAmount = depositAmount;
      updateData.splitProcessed = true;
    }

    // Credit user balance
    await db.$transaction(async (tx) => {
      // Acquire row lock on the deposit to prevent concurrent webhook processing
      const lockedDeposit = await tx.$queryRaw<Array<{ id: string; paymentStatus: string; splitProcessed: boolean }>>`
        SELECT id, "paymentStatus", "splitProcessed" FROM "NowPaymentsDeposit" WHERE id = ${deposit.id} FOR UPDATE
      `;

      // Double-check: if already processed, skip
      if (lockedDeposit.length > 0) {
        if (lockedDeposit[0].splitProcessed) {
          return; // Already processed by another webhook
        }
      }

      // Add to user balance and totalDeposited (totalInvested only increases on plan investment, not deposit)
      await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) + ${userAmount})::text, "totalDeposited" = (CAST("totalDeposited" AS NUMERIC) + ${userAmount})::text, "hasInvested" = true WHERE id = ${deposit.userId}`;

      // Update deposit status if linked
      if (deposit.depositId) {
        await tx.deposit.update({
          where: { id: deposit.depositId },
          data: {
            status: 'confirmed',
            txHash: `nowpayments_${paymentId}`,
            processedAt: new Date(),
          },
        });
      }

      // Create transaction record for user credit
      await tx.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          amount: ds(userAmount),
          status: 'completed',
          description: `Depósito NowPayments confirmado - ${dusdt(userAmount)} USDT${splitAmount > 0 ? ` (split: ${dusdt(splitAmount)} USDT para plataforma)` : ''}`,
          referenceId: deposit.id,
          referenceType: 'NowPaymentsDeposit',
        },
      });

      // Create transaction record for split (if applicable)
      if (splitAmount > 0) {
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'deposit',
            amount: ds(splitAmount),
            status: 'completed',
            description: `Split plataforma - ${dusdt(splitAmount)} USDT (${splitPct}%)`,
            referenceId: deposit.id,
            referenceType: 'NowPaymentsDeposit',
          },
        });
      }

      // Update deposit record (inside transaction to prevent double-credit on re-processing)
      await tx.nowPaymentsDeposit.update({
        where: { id: deposit.id },
        data: updateData,
      });
    });
  } else if (paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'refunded') {
    // Mark deposit as failed
    updateData.paymentStatus = paymentStatus;

    // Update deposit status if linked
    if (deposit.depositId) {
      await db.deposit.update({
        where: { id: deposit.depositId },
        data: {
          status: paymentStatus === 'expired' ? 'cancelled' : 'rejected',
          adminNotes: `NowPayments: pagamento ${paymentStatus}`,
          processedAt: new Date(),
        },
      });
    }

    // Update NowPaymentsDeposit record
    await db.nowPaymentsDeposit.update({
      where: { id: deposit.id },
      data: updateData,
    });
  }
}

// ============================================================================
// PAYOUT WEBHOOK PROCESSING
// ============================================================================

async function processPayoutWebhook(
  body: Record<string, unknown>,
  payoutId: string,
  payoutStatus: string
) {
  // Find the payout by NowPayments batch ID or withdrawal ID
  const payout = await db.nowPaymentsPayout.findFirst({
    where: {
      OR: [
        { nowpaymentsBatchId: payoutId },
        { nowpaymentsWithdrawalId: payoutId },
      ],
    },
    include: { user: true },
  });

  if (!payout) {
    console.warn(`[NowPayments Webhook] No payout found for payout_id: ${payoutId}`);
    return;
  }

  // Skip if already in a final state
  if (isPayoutFinal(payout.payoutStatus)) {
    return;
  }

  const updateData: Record<string, unknown> = {
    payoutStatus,
    updatedAt: new Date(),
  };

  if (payoutStatus === 'FINISHED') {
    updateData.completedAt = new Date();
    updateData.txHash = body.withdrawals
      ? JSON.stringify(body.withdrawals)
      : payout.txHash;

    await db.$transaction(async (tx) => {
      // Acquire row lock on payout to prevent duplicate webhook processing
      const lockedPayouts = await tx.$queryRaw<Array<{id: string}>>`SELECT id FROM "NowPaymentsPayout" WHERE id = ${payout.id} FOR UPDATE`;
      if (lockedPayouts.length === 0) return;

      // Check if the linked deposit is already 'confirmed' (admin approved)
      // If so, totalWithdrawn was already incremented by admin — don't double-count
      let depositAlreadyConfirmed = false;
      if (payout.depositId) {
        const linkedDeposit = await tx.deposit.findUnique({ where: { id: payout.depositId } });
        depositAlreadyConfirmed = linkedDeposit?.status === 'confirmed' || linkedDeposit?.status === 'completed';
      }

      // Update linked deposit
      if (payout.depositId) {
        await tx.deposit.update({
          where: { id: payout.depositId },
          data: {
            status: 'completed',
            processedAt: new Date(),
          },
        });
      }

      // Update linked transaction
      if (payout.depositId) {
        await tx.transaction.updateMany({
          where: {
            referenceId: payout.depositId,
            referenceType: 'Deposit',
            type: 'withdrawal',
          },
          data: { status: 'completed' },
        });
      }

      // Only increment totalWithdrawn if admin hasn't already done so
      if (!depositAlreadyConfirmed) {
        await tx.$executeRaw`UPDATE "User" SET "totalWithdrawn" = (CAST("totalWithdrawn" AS NUMERIC) + ${d(payout.amount)})::text WHERE id = ${payout.userId}`;
      }

      // Update payout record inside transaction
      await tx.nowPaymentsPayout.update({
        where: { id: payout.id },
        data: updateData,
      });
    });

  } else if (payoutStatus === 'FAILED' || payoutStatus === 'REJECTED') {
    // Refund the user's balance since payout failed
    // BUG #6 fix: refund only the original deducted amount (payout.amount), not amount + fee
    // The fee was never deducted from the user's balance separately
    const refundAmount = d(payout.amount);

    await db.$transaction(async (tx) => {
      // Acquire row lock on payout to prevent duplicate webhook processing
      const lockedPayouts = await tx.$queryRaw<Array<{id: string}>>`SELECT id FROM "NowPaymentsPayout" WHERE id = ${payout.id} FOR UPDATE`;
      if (lockedPayouts.length === 0) return;

      // Check if totalWithdrawn was previously incremented for this withdrawal
      // (it's incremented when admin approves or when webhook processes FINISHED)
      let shouldDecrementTotalWithdrawn = false;
      if (payout.depositId) {
        const linkedDeposit = await tx.deposit.findUnique({ where: { id: payout.depositId } });
        // If deposit was confirmed/completed, totalWithdrawn was already incremented
        shouldDecrementTotalWithdrawn = linkedDeposit?.status === 'confirmed' || linkedDeposit?.status === 'completed';
      }

      // Refund balance
      if (shouldDecrementTotalWithdrawn) {
        await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) + ${refundAmount})::text, "totalWithdrawn" = GREATEST(0, (CAST("totalWithdrawn" AS NUMERIC) - ${d(payout.amount)})::numeric)::text WHERE id = ${payout.userId}`;
      } else {
        await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) + ${refundAmount})::text WHERE id = ${payout.userId}`;
      }

      // Update deposit
      if (payout.depositId) {
        await tx.deposit.update({
          where: { id: payout.depositId },
          data: {
            status: 'rejected',
            adminNotes: `NowPayments: saque ${payoutStatus}`,
            processedAt: new Date(),
          },
        });
      }

      // Create refund transaction
      await tx.transaction.create({
        data: {
          userId: payout.userId,
          type: 'deposit',
          amount: ds(refundAmount),
          status: 'completed',
          description: `Reembolso - Saque NowPayments ${payoutStatus}`,
          referenceId: payout.id,
          referenceType: 'NowPaymentsPayout',
        },
      });

      // Update payout record inside transaction
      await tx.nowPaymentsPayout.update({
        where: { id: payout.id },
        data: updateData,
      });
    });
  }
}
