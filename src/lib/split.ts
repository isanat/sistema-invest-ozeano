// ============================================================================
// SPLIT PROCESSING ENGINE — Multi-recipient deposit split
// ============================================================================
// The user ALWAYS receives 100% of the deposit in internal balance.
// The split comes from the NowPayments custody account, not the user's balance.
// Each active SplitRecipient gets their % accumulated (not paid immediately).
// Auto-payout triggers when accumulated >= minPayout.
// ============================================================================

import { db } from '@/lib/db';
import { d, ds } from '@/lib/auth';
import { createPayout } from '@/lib/nowpayments';

export interface SplitResult {
  totalSplitPct: number;
  totalSplitAmount: number;
  recipients: Array<{
    id: string;
    name: string;
    percentage: number;
    amount: number;
    newAccumulated: number;
    autoPayoutTriggered: boolean;
  }>;
}

/**
 * Process split for a confirmed NowPayments deposit.
 * Called AFTER user balance has been credited with 100% of the deposit.
 * Split amounts accumulate per-recipient; auto-payout when threshold met.
 */
export async function processDepositSplit(
  depositAmount: number,
  nowpaymentsDepositId: string,
): Promise<SplitResult> {
  const result: SplitResult = {
    totalSplitPct: 0,
    totalSplitAmount: 0,
    recipients: [],
  };

  // Get all active recipients
  const recipients = await db.splitRecipient.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (recipients.length === 0) {
    return result; // No recipients configured — skip split
  }

  // Calculate split amounts
  for (const recipient of recipients) {
    const pct = d(recipient.percentage);
    const splitAmount = depositAmount * (pct / 100);
    const newAccumulated = d(recipient.accumulatedBalance) + splitAmount;

    result.totalSplitPct += pct;
    result.totalSplitAmount += splitAmount;
    result.recipients.push({
      id: recipient.id,
      name: recipient.name,
      percentage: pct,
      amount: splitAmount,
      newAccumulated,
      autoPayoutTriggered: false,
    });
  }

  // Create SplitLog entries + update accumulated balances (atomic)
  await db.$transaction(async (tx) => {
    for (const r of result.recipients) {
      // Create audit log entry
      await tx.splitLog.create({
        data: {
          recipientId: r.id,
          depositId: nowpaymentsDepositId,
          amount: ds(r.amount),
          percentage: ds(r.percentage),
          status: 'accumulated',
        },
      });

      // Update accumulated balance
      await tx.splitRecipient.update({
        where: { id: r.id },
        data: {
          accumulatedBalance: ds(r.newAccumulated),
        },
      });
    }
  });

  // Process auto-payouts for recipients that meet threshold (outside transaction)
  for (const r of result.recipients) {
    const recipient = await db.splitRecipient.findUnique({ where: { id: r.id } });
    if (!recipient) continue;

    const accumulated = d(recipient.accumulatedBalance);
    const minPayout = d(recipient.minPayout);

    if (recipient.autoPayout && accumulated >= minPayout) {
      try {
        await createPayout([{
          address: recipient.walletAddress,
          currency: recipient.currency,
          amount: accumulated,
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
          payout_description: `Split auto-payout - ${recipient.name} - ${recipient.percentage}%`,
        }], `Split auto-payout for ${recipient.name}`);

        // Mark logs as paid and reset accumulated
        await db.$transaction(async (tx) => {
          await tx.splitLog.updateMany({
            where: {
              recipientId: recipient.id,
              status: 'accumulated',
            },
            data: {
              status: 'paid',
              paidAt: new Date(),
            },
          });

          await tx.splitRecipient.update({
            where: { id: recipient.id },
            data: {
              accumulatedBalance: '0',
              totalSent: ds(d(recipient.totalSent) + accumulated),
            },
          });
        });

        r.autoPayoutTriggered = true;
      } catch (err) {
        console.error(`[Split] Auto-payout failed for ${recipient.name}:`, err);
        // Accumulated stays — admin can force payout later
      }
    }
  }

  return result;
}
