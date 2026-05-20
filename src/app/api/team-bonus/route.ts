import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getTeamBonusPct } from '@/lib/affiliate';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, referredBy: true },
    });

    if (!user) return apiError('Usuário não encontrado', 404);

    const directReferrals = await db.user.count({
      where: { referredBy: session.userId, hasInvested: true },
    });

    const bonusPct = await getTeamBonusPct(session.userId);

    // Determine tier dynamically from database ranks
    let tier = 'none';
    let nextTier: string | null = 'Bronze';
    let referralsToNext = 0;

    const ranks = await db.affiliateRank.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Find current and next rank based on direct referrals
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      if (directReferrals >= rank.minReferrals) {
        tier = rank.name.toLowerCase();
        if (i + 1 < ranks.length) {
          nextTier = ranks[i + 1].name;
          referralsToNext = Math.max(0, ranks[i + 1].minReferrals - directReferrals);
        } else {
          nextTier = null;
          referralsToNext = 0;
        }
        break;
      } else {
        // User doesn't qualify for this rank yet
        nextTier = rank.name;
        referralsToNext = Math.max(0, rank.minReferrals - directReferrals);
      }
    }

    return apiSuccess({
      tier,
      bonusPct,
      directReferrals,
      nextTier,
      referralsToNext,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
