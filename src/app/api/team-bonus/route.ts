import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getTeamBonusPct } from '@/lib/affiliate';
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    if (!userId) return apiError('Não autorizado', 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, referredBy: true },
    });

    if (!user) return apiError('Usuário não encontrado', 404);

    const directReferrals = await db.user.count({
      where: { referredBy: userId, hasInvested: true },
    });

    const bonusPct = await getTeamBonusPct(userId);

    let tier = 'none';
    let nextTier = 'Bronze';
    let referralsToNext = 10 - directReferrals;

    if (directReferrals >= 30) {
      tier = 'gold';
      nextTier = null;
      referralsToNext = 0;
    } else if (directReferrals >= 20) {
      tier = 'silver';
      nextTier = 'Ouro';
      referralsToNext = 30 - directReferrals;
    } else if (directReferrals >= 10) {
      tier = 'bronze';
      nextTier = 'Prata';
      referralsToNext = 20 - directReferrals;
    }

    return apiSuccess({
      tier,
      bonusPct,
      directReferrals,
      nextTier,
      referralsToNext: Math.max(0, referralsToNext),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
