import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, dusdt } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    // Get all active vouchers for the user
    const activeVouchers = await db.voucher.findMany({
      where: {
        userId,
        status: 'active',
      },
    });

    if (activeVouchers.length === 0) {
      return apiSuccess({ vouchers: [], message: 'Nenhum voucher ativo encontrado' });
    }

    // Count all direct referrals for this user
    const directReferralsResult = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "User" WHERE "referredBy" = ${userId}
    `;
    const totalDirectReferrals = Number(directReferralsResult[0]?.count ?? 0);

    const updatedVouchers = [];

    for (const voucher of activeVouchers) {
      const goalMinInvest = d(voucher.goalMinReferralInvest);
      const goalNetworkMultiple = d(voucher.goalNetworkMultiple);
      const voucherAmount = d(voucher.amount);

      // Count qualifying referrals (those who invested >= goalMinReferralInvest)
      const qualifyingResult = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "User"
        WHERE "referredBy" = ${userId}
        AND CAST("totalInvested" AS NUMERIC) >= ${goalMinInvest}
      `;
      const qualifyingReferrals = Number(qualifyingResult[0]?.count ?? 0);

      // Calculate total network investment (sum of totalInvested for all referred users)
      const networkResult = await db.$queryRaw<Array<{ total: number | null }>>`
        SELECT COALESCE(SUM(CAST("totalInvested" AS NUMERIC)), 0) as total
        FROM "User" WHERE "referredBy" = ${userId}
      `;
      const currentNetworkInvestment = d(networkResult[0]?.total ?? 0);

      // Calculate goal network target
      const goalNetworkTarget = goalNetworkMultiple * voucherAmount;

      // Calculate gradual withdrawal unlock percentage based on tiers
      let withdrawalUnlockPct = 0;

      // Tier 1 (25% unlock): qualifyingReferrals >= 50% of goalDirectReferrals
      const tier1Qualifying = voucher.goalDirectReferrals * 0.5;
      if (qualifyingReferrals >= tier1Qualifying) {
        withdrawalUnlockPct = 25;
      }

      // Tier 2 (50% unlock): qualifyingReferrals >= 75% of goalDirectReferrals
      //   AND currentNetworkInvestment >= 50% of (goalNetworkMultiple × amount)
      const tier2Qualifying = voucher.goalDirectReferrals * 0.75;
      const tier2NetworkTarget = goalNetworkTarget * 0.5;
      if (qualifyingReferrals >= tier2Qualifying && currentNetworkInvestment >= tier2NetworkTarget) {
        withdrawalUnlockPct = 50;
      }

      // Tier 3 (75% unlock): qualifyingReferrals >= goalDirectReferrals
      //   AND currentNetworkInvestment >= 75% of (goalNetworkMultiple × amount)
      const tier3NetworkTarget = goalNetworkTarget * 0.75;
      if (qualifyingReferrals >= voucher.goalDirectReferrals && currentNetworkInvestment >= tier3NetworkTarget) {
        withdrawalUnlockPct = 75;
      }

      // Tier 4 (100% unlock): qualifyingReferrals >= goalDirectReferrals
      //   AND currentNetworkInvestment >= (goalNetworkMultiple × amount)
      if (qualifyingReferrals >= voucher.goalDirectReferrals && currentNetworkInvestment >= goalNetworkTarget) {
        withdrawalUnlockPct = 100;
      }

      // Check if all goals met → mark as completed
      const allGoalsMet = qualifyingReferrals >= voucher.goalDirectReferrals && currentNetworkInvestment >= goalNetworkTarget;
      const deadlinePassed = new Date(voucher.deadline) < new Date();

      // Determine new status
      let newStatus = voucher.status;
      let completedAt: Date | null = null;
      let shouldDeductBalance = false;

      if (allGoalsMet) {
        newStatus = 'completed';
        withdrawalUnlockPct = 100;
        completedAt = new Date();
      } else if (deadlinePassed) {
        newStatus = 'expired';
        shouldDeductBalance = true;
      }

      // Update the voucher
      await db.$transaction(async (tx) => {
        // Lock the voucher row inside the transaction
        await tx.$queryRaw`SELECT 1 FROM "Voucher" WHERE id = ${voucher.id} FOR UPDATE`;
        // Re-read the voucher status after lock
        const lockedVoucher = await tx.voucher.findUnique({ where: { id: voucher.id } });
        if (lockedVoucher?.status !== 'active') {
          return; // Already processed by another request
        }

        await tx.voucher.update({
          where: { id: voucher.id },
          data: {
            currentDirectReferrals: totalDirectReferrals,
            currentNetworkInvestment: dusdt(currentNetworkInvestment),
            qualifyingReferrals,
            withdrawalUnlockPct: String(withdrawalUnlockPct),
            lastProgressUpdate: new Date(),
            ...(newStatus !== voucher.status ? {
              status: newStatus,
              ...(completedAt ? { completedAt } : {}),
            } : {}),
          },
        });

        // If expired, remove remaining voucher balance from user
        if (shouldDeductBalance) {
          const freshRemaining = d(lockedVoucher.amount) - d(lockedVoucher.usedAmount);
          if (freshRemaining > 0) {
            await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = GREATEST(0, (CAST("voucherBalance" AS NUMERIC) - ${freshRemaining}))::text WHERE id = ${userId}`;
          }
        }
      });

      // Fetch updated voucher
      const updated = await db.voucher.findUnique({
        where: { id: voucher.id },
        include: {
          usages: {
            include: {
              investment: {
                select: {
                  id: true,
                  amount: true,
                  startDate: true,
                  plan: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      if (updated) {
        const usedAmount = d(updated.usedAmount);
        const availableBalance = voucherAmount - usedAmount;
        updatedVouchers.push({
          ...updated,
          availableBalance: dusdt(availableBalance),
          goalNetworkTarget: dusdt(goalNetworkTarget),
        });
      }
    }

    return apiSuccess({ vouchers: updatedVouchers });
  } catch (error) {
    return handleApiError(error);
  }
}
