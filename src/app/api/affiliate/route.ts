import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { generateAffiliateCode, getAffiliateModeInfo } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        affiliateCode: true,
        linkUnlocked: true,
        hasInvested: true,
        totalAffiliateEarnings: true,
        affiliateBalance: true,
        referrals: { select: { id: true } },
      },
    });

    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    // Get referrals by level (with error isolation)
    const referralTree: Record<number, Array<{ id: string; name: string; email: string; createdAt: Date; totalInvested: string }>> = {};
    try {
      for (let level = 1; level <= 11; level++) {
        const referrals = await getReferralsAtLevel(user.id, level);
        referralTree[level] = referrals;
      }
    } catch (e) {
      console.error('[Affiliate] Error loading referral tree:', e);
    }

    // Get commission summary by level - manual aggregation since commissionAmount is String
    let commissionByLevel: Array<{ level: number; _sum: { commissionAmount: number }; _count: number }> = [];
    try {
      const allCommissions = await db.affiliateCommission.findMany({
        where: { userId: session.userId },
        select: { level: true, commissionAmount: true },
      });

      const levelMap = new Map<number, { sum: number; count: number }>();

      for (const c of allCommissions) {
        const existing = levelMap.get(c.level) || { sum: 0, count: 0 };
        existing.sum += d(c.commissionAmount);
        existing.count += 1;
        levelMap.set(c.level, existing);
      }

      for (const [level, data] of levelMap.entries()) {
        commissionByLevel.push({
          level,
          _sum: { commissionAmount: data.sum },
          _count: data.count,
        });
      }
    } catch (e) {
      console.error('[Affiliate] Error loading commissions by level:', e);
    }

    // Recent commissions
    let recentCommissions: any[] = [];
    try {
      recentCommissions = await db.affiliateCommission.findMany({
        where: { userId: session.userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    } catch (e) {
      console.error('[Affiliate] Error loading recent commissions:', e);
    }

    // Total referrals count
    const totalReferrals = Object.values(referralTree).reduce((sum, refs) => sum + refs.length, 0);
    const directReferrals = user.referrals.length;

    // Get affiliate mode config for frontend display
    let modeInfo = { mode: 'system_margin' as const, systemMarginPct: 30, poolRevenuePct: 5, investmentBonusPct: 2 };
    try {
      modeInfo = await getAffiliateModeInfo();
    } catch (e) {
      console.error('[Affiliate] Error loading mode info:', e);
    }

    // =====================================================================
    // RANKS system (isolated from errors)
    // =====================================================================
    let ranks: any[] = [];
    let currentRank: any = null;
    let nextRank: any = null;

    try {
      ranks = await db.affiliateRank.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const userTotalEarnings = d(user.totalAffiliateEarnings);

      // Sort ranks descending to find the highest qualifying rank
      const ranksDesc = [...ranks].sort((a: any, b: any) => b.sortOrder - a.sortOrder);
      for (const rank of ranksDesc) {
        if (directReferrals >= rank.minReferrals && userTotalEarnings >= d(rank.minEarnings)) {
          currentRank = rank;
          break;
        }
      }

      // Find next rank
      const currentSortOrder = currentRank ? currentRank.sortOrder : -1;
      const ranksAboveCurrent = ranks.filter((r: any) => r.sortOrder > currentSortOrder).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      if (ranksAboveCurrent.length > 0) {
        const next = ranksAboveCurrent[0];
        nextRank = {
          ...next,
          referralsNeeded: Math.max(0, next.minReferrals - directReferrals),
          earningsNeeded: Math.max(0, d(next.minEarnings) - userTotalEarnings),
        };
      }
    } catch (e) {
      console.error('[Affiliate] Error loading ranks:', e);
    }

    // =====================================================================
    // MILESTONES with claimed status (isolated)
    // =====================================================================
    let milestonesWithStatus: any[] = [];
    try {
      const milestones = await db.affiliateMilestone.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const userClaims = await db.affiliateMilestoneClaim.findMany({
        where: { userId: session.userId },
        select: { milestoneId: true, claimedAt: true },
      });
      const claimedMap = new Map(userClaims.map(c => [c.milestoneId, c.claimedAt]));

      milestonesWithStatus = milestones.map(m => ({
        ...m,
        claimed: claimedMap.has(m.id),
        claimedAt: claimedMap.get(m.id) || null,
        canClaim: directReferrals >= m.targetCount && !claimedMap.has(m.id),
      }));
    } catch (e) {
      console.error('[Affiliate] Error loading milestones:', e);
    }

    // =====================================================================
    // ACTIVE CONTESTS (isolated)
    // =====================================================================
    let contests: any[] = [];
    try {
      contests = await db.affiliateContest.findMany({
        where: {
          isActive: true,
          endDate: { gt: new Date() },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { startDate: 'desc' },
        ],
      });
    } catch (e) {
      console.error('[Affiliate] Error loading contests:', e);
    }

    // =====================================================================
    // LEADERBOARD - Top 10 affiliates by totalAffiliateEarnings (isolated)
    // =====================================================================
    let leaderboard: any[] = [];
    try {
      const topAffiliates = await db.user.findMany({
        where: {
          totalAffiliateEarnings: { not: '0' },
          linkUnlocked: true,
        },
        select: {
          id: true,
          name: true,
          totalAffiliateEarnings: true,
          referrals: { select: { id: true } },
        },
      });

      const allRanksForLeaderboard = await db.affiliateRank.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const sortedAffiliates = topAffiliates
        .map(a => ({
          id: a.id,
          nameInitial: a.name ? a.name.charAt(0).toUpperCase() : '?',
          totalEarnings: d(a.totalAffiliateEarnings),
          totalReferrals: a.referrals.length,
          rankName: '',
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10);

      for (const aff of sortedAffiliates) {
        const ranksD = [...allRanksForLeaderboard].sort((a: any, b: any) => b.sortOrder - a.sortOrder);
        for (const rank of ranksD) {
          if (aff.totalReferrals >= rank.minReferrals && aff.totalEarnings >= d(rank.minEarnings)) {
            aff.rankName = rank.name;
            break;
          }
        }
      }

      leaderboard = sortedAffiliates.map((aff, index) => ({
        rank: index + 1,
        nameInitial: aff.nameInitial,
        totalEarnings: aff.totalEarnings,
        totalReferrals: aff.totalReferrals,
        currentRankName: aff.rankName || null,
      }));
    } catch (e) {
      console.error('[Affiliate] Error loading leaderboard:', e);
    }

    // =====================================================================
    // BADGES - All badges with earned status + AUTO-AWARD (isolated)
    // =====================================================================
    let badgesWithStatus: any[] = [];
    try {
      const allBadges = await db.affiliateBadge.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const userBadgeAwards = await db.affiliateBadgeAward.findMany({
        where: { userId: session.userId },
        select: { badgeId: true, awardedAt: true },
      });
      const awardedMap = new Map(userBadgeAwards.map(b => [b.badgeId, b.awardedAt]));

      const userTotalEarnings = d(user.totalAffiliateEarnings);

      // Auto-award badges that user qualifies for but hasn't received yet
      const badgesToAward: string[] = [];
      for (const badge of allBadges) {
        if (awardedMap.has(badge.id) || !badge.isAuto) continue;

        let qualifies = false;
        try {
          const req = JSON.parse(badge.requirement);
          if (req.type === 'referrals' && directReferrals >= req.count) {
            qualifies = true;
          } else if (req.type === 'earnings' && userTotalEarnings >= req.amount) {
            qualifies = true;
          } else if (req.type === 'active_referrals' && directReferrals >= req.count) {
            qualifies = true;
          }
        } catch (e) {
          // Invalid requirement format
        }

        if (qualifies) {
          badgesToAward.push(badge.id);
        }
      }

      // Award qualifying badges in the background
      if (badgesToAward.length > 0) {
        try {
          for (const badgeId of badgesToAward) {
            await db.affiliateBadgeAward.upsert({
              where: { userId_badgeId: { userId: session.userId, badgeId } },
              create: { userId: session.userId, badgeId },
              update: {},
            });
            // Add to awardedMap so it shows as earned immediately
            awardedMap.set(badgeId, new Date());

            // If badge has cash reward, credit it
            const badge = allBadges.find(b => b.id === badgeId);
            if (badge && badge.rewardType === 'cash') {
              const rewardValue = d(badge.rewardValue);
              if (rewardValue > 0) {
                await db.$executeRaw`UPDATE "User" SET "affiliateBalance" = (CAST("affiliateBalance" AS NUMERIC) + ${rewardValue})::text, "totalAffiliateEarnings" = (CAST("totalAffiliateEarnings" AS NUMERIC) + ${rewardValue})::text WHERE id = ${session.userId}`;
                await db.transaction.create({
                  data: {
                    userId: session.userId,
                    type: 'affiliate_commission',
                    amount: rewardValue.toFixed(8),
                    status: 'completed',
                    description: `Recompensa badge: ${badge.name}`,
                    referenceId: badgeId,
                    referenceType: 'AffiliateBadge',
                  },
                });
              }
            }
          }
        } catch (awardErr) {
          console.error('[Affiliate] Error auto-awarding badges:', awardErr);
        }
      }

      badgesWithStatus = allBadges.map(badge => {
        const isEarned = awardedMap.has(badge.id);
        let progress = 0;
        let isClose = false;

        try {
          const req = JSON.parse(badge.requirement);
          if (req.type === 'referrals') {
            progress = Math.min(100, (directReferrals / req.count) * 100);
            isClose = directReferrals >= req.count * 0.5 && !isEarned;
          } else if (req.type === 'earnings') {
            progress = Math.min(100, (userTotalEarnings / req.amount) * 100);
            isClose = userTotalEarnings >= req.amount * 0.5 && !isEarned;
          } else if (req.type === 'active_referrals') {
            progress = Math.min(100, (directReferrals / req.count) * 100);
            isClose = directReferrals >= req.count * 0.5 && !isEarned;
          }
        } catch (e) {
          // Invalid requirement format
        }

        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          category: badge.category,
          requirement: badge.requirement,
          rewardType: badge.rewardType,
          rewardValue: badge.rewardValue,
          isAuto: badge.isAuto,
          sortOrder: badge.sortOrder,
          earned: isEarned,
          awardedAt: awardedMap.get(badge.id) || null,
          progress,
          isClose,
        };
      });
    } catch (e) {
      console.error('[Affiliate] Error loading badges:', e);
    }

    // =====================================================================
    // AFFILIATE LEVELS - current commission percentages (isolated)
    // =====================================================================
    let affiliateLevels: any[] = [];
    try {
      affiliateLevels = await db.affiliateLevel.findMany({
        where: { isActive: true },
        orderBy: { level: 'asc' },
      });
    } catch (e) {
      console.error('[Affiliate] Error loading affiliate levels:', e);
    }

    return apiSuccess({
      affiliate: {
        code: user.affiliateCode,
        linkUnlocked: user.linkUnlocked,
        hasInvested: user.hasInvested,
        totalEarnings: d(user.totalAffiliateEarnings),
        affiliateBalance: d(user.affiliateBalance),
        totalReferrals,
        directReferrals,
        referralTree,
        commissionByLevel,
        recentCommissions,
        commissionMode: modeInfo.mode,
        systemMarginPct: modeInfo.systemMarginPct,
        poolRevenuePct: modeInfo.poolRevenuePct,
        investmentBonusPct: modeInfo.investmentBonusPct,
      },
      ranks,
      currentRank,
      nextRank,
      milestones: milestonesWithStatus,
      contests,
      leaderboard,
      badges: badgesWithStatus,
      affiliateLevels,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Safely parse body - frontend may send POST without body (unlock affiliate link)
    let body: Record<string, any> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty or invalid body - treat as empty object (unlock affiliate link)
    }

    // Handle milestone claim
    if (body.action === 'claimMilestone' || body.milestoneId) {
      const milestoneId = body.milestoneId;

      if (!milestoneId) {
        return apiError('ID do marco é obrigatório');
      }

      const milestone = await db.affiliateMilestone.findUnique({
        where: { id: milestoneId },
      });

      if (!milestone || !milestone.isActive) {
        return apiError('Marco não encontrado', 404);
      }

      // Check if already claimed
      const existingClaim = await db.affiliateMilestoneClaim.findUnique({
        where: {
          userId_milestoneId: {
            userId: session.userId,
            milestoneId,
          },
        },
      });

      if (existingClaim) {
        return apiError('Este marco já foi reivindicado', 409);
      }

      // Check if user meets the requirement
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          totalAffiliateEarnings: true,
          affiliateBalance: true,
          referrals: { select: { id: true } },
        },
      });

      if (!user) {
        return apiError('Usuário não encontrado', 404);
      }

      const directReferrals = user.referrals.length;
      if (directReferrals < milestone.targetCount) {
        return apiError(`Você precisa de ${milestone.targetCount} indicações para reivindicar este marco. Você tem ${directReferrals}.`, 400);
      }

      // Claim the milestone
      const claim = await db.affiliateMilestoneClaim.create({
        data: {
          userId: session.userId,
          milestoneId,
        },
      });

      // If reward is cash, add to user balance
      if (milestone.rewardType === 'cash') {
        const rewardValue = d(milestone.rewardValue);
        if (rewardValue > 0) {
          await db.$executeRaw`UPDATE "User" SET "affiliateBalance" = (CAST("affiliateBalance" AS NUMERIC) + ${rewardValue})::text, "totalAffiliateEarnings" = (CAST("totalAffiliateEarnings" AS NUMERIC) + ${rewardValue})::text WHERE id = ${session.userId}`;

          await db.transaction.create({
            data: {
              userId: session.userId,
              type: 'affiliate_commission',
              amount: rewardValue.toFixed(8),
              status: 'completed',
              description: `Recompensa do marco: ${milestone.name}`,
              referenceId: milestoneId,
              referenceType: 'AffiliateMilestone',
            },
          });
        }
      }

      return apiSuccess({
        claim,
        reward: {
          type: milestone.rewardType,
          value: d(milestone.rewardValue),
        },
        message: 'Marco reivindicado com sucesso!',
      });
    }

    // Default POST: unlock affiliate link (existing behavior)
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        affiliateCode: true,
        linkUnlocked: true,
        hasInvested: true,
      },
    });

    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    if (!user.hasInvested) {
      return apiError('Você precisa ter um investimento ativo para desbloquear o link de afiliado', 403);
    }

    if (user.linkUnlocked) {
      return apiSuccess({
        affiliateCode: user.affiliateCode,
        message: 'Link de afiliado já está ativo',
      });
    }

    // Unlock affiliate link
    let affiliateCode = user.affiliateCode;
    if (!affiliateCode) {
      const freshUser = await db.user.findUnique({ where: { id: session.userId } });
      affiliateCode = freshUser?.affiliateCode || generateAffiliateCode(user.name);
    }

    await db.user.update({
      where: { id: session.userId },
      data: {
        linkUnlocked: true,
        affiliateCode,
      },
    });

    return apiSuccess({
      affiliateCode,
      message: 'Link de afiliado desbloqueado com sucesso!',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper: get referrals at a specific level
async function getReferralsAtLevel(userId: string, targetLevel: number) {
  let currentLevelIds = [userId];

  for (let level = 1; level <= targetLevel; level++) {
    const nextLevel = await db.user.findMany({
      where: { referredBy: { in: currentLevelIds } },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        totalInvested: true,
      },
    });

    if (level === targetLevel) {
      return nextLevel;
    }

    currentLevelIds = nextLevel.map((u) => u.id);
  }

  return [];
}
