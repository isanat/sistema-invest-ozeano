import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, dusdt } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const vouchers = await db.voucher.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        usages: {
          include: {
            rental: {
              select: {
                id: true,
                amount: true,
                startDate: true,
                miner: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const vouchersWithProgress = vouchers.map((v) => {
      const amount = d(v.amount);
      const usedAmount = d(v.usedAmount);
      const availableBalance = amount - usedAmount;
      const goalNetworkTarget = d(v.goalNetworkMultiple) * amount;
      const currentNetwork = d(v.currentNetworkInvestment);

      // Calculate goal completion percentage (min of referral and network progress)
      const referralProgress = v.goalDirectReferrals > 0
        ? (v.qualifyingReferrals / v.goalDirectReferrals) * 100
        : 0;
      const networkProgress = goalNetworkTarget > 0
        ? (currentNetwork / goalNetworkTarget) * 100
        : 0;
      const goalPct = Math.min(100, Math.round(Math.min(referralProgress, networkProgress)));

      // Check if deadline has passed
      const isExpired = v.status === 'active' && new Date(v.deadline) < new Date();
      const daysRemaining = v.status === 'active'
        ? Math.max(0, Math.ceil((new Date(v.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        ...v,
        availableBalance: dusdt(availableBalance),
        withdrawalUnlockPct: v.withdrawalUnlockPct,
        goalCompletionPct: goalPct,
        referralProgress: Math.round(referralProgress),
        networkProgress: Math.round(networkProgress),
        goalNetworkTarget: dusdt(goalNetworkTarget),
        isExpired,
        daysRemaining,
      };
    });

    return apiSuccess({ vouchers: vouchersWithProgress });
  } catch (error) {
    return handleApiError(error);
  }
}
