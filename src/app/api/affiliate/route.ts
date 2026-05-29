import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAuth, d, ds } from '@/lib/auth';
import { generateAffiliateCode, getAffiliateModeInfo } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// ============================================================================
// Type definitions for affiliate data structures
// ============================================================================

interface AffiliateRankData {
  id: string;
  name: string;
  icon: string;
  color: string;
  minReferrals: number;
  minEarnings: string;
  bonusAmount: string;
  commissionBoost: string;
  perks: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface NextRankData extends AffiliateRankData {
  referralsNeeded: number;
  earningsNeeded: number;
}

interface MilestoneWithStatus {
  id: string;
  name: string;
  description: string | null;
  targetCount: number;
  rewardType: string;
  rewardValue: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  claims: Array<{ id: string; userId: string; milestoneId: string; claimedAt: Date }>;
  claimed: boolean;
  claimedAt: Date | null;
  canClaim: boolean;
}

interface LeaderboardEntry {
  rank: number;
  nameInitial: string;
  totalEarnings: number;
  totalReferrals: number;
  currentRankName: string | null;
}

interface BadgeWithStatus {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  requirement: string;
  rewardType: string;
  rewardValue: string;
  isAuto: boolean;
  sortOrder: number;
  earned: boolean;
  awardedAt: Date | null;
  progress: number;
  isClose: boolean;
}

interface AffiliateLevelData {
  id: string;
  level: number;
  percentage: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

    const directReferrals = user.referrals.length;
    const userTotalEarnings = d(user.totalAffiliateEarnings);

    // =====================================================================
    // PARALLEL QUERIES — Batch independent queries with Promise.all
    // Each query has its own error isolation (Bug 5 fix)
    // =====================================================================
    const [
      referralTreeResult,
      commissionByLevelResult,
      recentCommissionsResult,
      modeInfoResult,
      ranksResult,
      milestonesResult,
      contestsResult,
      leaderboardResult,
      badgesResult,
      affiliateLevelsResult,
    ] = await Promise.all([
      // Bug 1: Single-pass referral tree (11 queries total, not 66)
      (async () => {
        const tree: Record<number, Array<{ id: string; name: string; email: string; createdAt: Date; totalInvested: string }>> = {};
        try {
          let currentLevelIds = [user.id];
          for (let level = 1; level <= 11; level++) {
            const referrals = await db.user.findMany({
              where: { referredBy: { in: currentLevelIds } },
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                totalInvested: true,
              },
            });
            tree[level] = referrals;
            currentLevelIds = referrals.map((u) => u.id);
            if (currentLevelIds.length === 0) break; // No more referrals at deeper levels
          }
        } catch (e) {
          console.error('[Affiliate] Error loading referral tree:', e);
        }
        return tree;
      })(),

      // Commission summary by level
      (async () => {
        const result: Array<{ level: number; _sum: { commissionAmount: number }; _count: number }> = [];
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
            result.push({
              level,
              _sum: { commissionAmount: data.sum },
              _count: data.count,
            });
          }
        } catch (e) {
          console.error('[Affiliate] Error loading commissions by level:', e);
        }
        return result;
      })(),

      // Recent commissions
      (async () => {
        try {
          return await db.affiliateCommission.findMany({
            where: { userId: session.userId },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
            },
          });
        } catch (e) {
          console.error('[Affiliate] Error loading recent commissions:', e);
          return [];
        }
      })(),

      // Mode info
      (async () => {
        try {
          return await getAffiliateModeInfo();
        } catch (e) {
          console.error('[Affiliate] Error loading mode info:', e);
          return { mode: 'system_margin' as const, systemMarginPct: 30, poolRevenuePct: 5, investmentBonusPct: 2 };
        }
      })(),

      // Ranks — compute currentRank/nextRank inside the async block
      (async () => {
        const result: { ranks: AffiliateRankData[]; currentRank: AffiliateRankData | null; nextRank: NextRankData | null } = {
          ranks: [], currentRank: null, nextRank: null,
        };
        try {
          result.ranks = await db.affiliateRank.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          });

          // Sort ranks descending to find the highest qualifying rank
          const ranksDesc = [...result.ranks].sort((a, b) => b.sortOrder - a.sortOrder);
          for (const rank of ranksDesc) {
            if (directReferrals >= rank.minReferrals && userTotalEarnings >= d(rank.minEarnings)) {
              result.currentRank = rank;
              break;
            }
          }

          // Find next rank
          const currentSortOrder = result.currentRank ? result.currentRank.sortOrder : -1;
          const ranksAboveCurrent = result.ranks.filter((r) => r.sortOrder > currentSortOrder).sort((a, b) => a.sortOrder - b.sortOrder);
          if (ranksAboveCurrent.length > 0) {
            const next = ranksAboveCurrent[0];
            result.nextRank = {
              ...next,
              referralsNeeded: Math.max(0, next.minReferrals - directReferrals),
              earningsNeeded: Math.max(0, d(next.minEarnings) - userTotalEarnings),
            };
          }
        } catch (e) {
          console.error('[Affiliate] Error loading ranks:', e);
        }
        return result;
      })(),

      // Milestones
      (async () => {
        const result: MilestoneWithStatus[] = [];
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

          return milestones.map(m => ({
            ...m,
            claimed: claimedMap.has(m.id),
            claimedAt: claimedMap.get(m.id) || null,
            canClaim: directReferrals >= m.targetCount && !claimedMap.has(m.id),
          }));
        } catch (e) {
          console.error('[Affiliate] Error loading milestones:', e);
        }
        return result;
      })(),

      // Contests
      (async () => {
        try {
          return await db.affiliateContest.findMany({
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
          return [];
        }
      })(),

      // Bug 3: Leaderboard with DB-level sort/limit via raw SQL
      (async () => {
        const result: LeaderboardEntry[] = [];
        try {
          // Use raw SQL for proper numeric sort on String column + LIMIT at DB level
          const topAffiliatesRaw = await db.$queryRaw<
            Array<{ id: string; name: string; totalAffiliateEarnings: string; referralCount: bigint }>
          >`SELECT u.id, u.name, u."totalAffiliateEarnings", (SELECT COUNT(*) FROM "User" r WHERE r."referredBy" = u.id) as referralCount FROM "User" u WHERE u."totalAffiliateEarnings" != '0' AND CAST(u."linkUnlocked" AS INTEGER) = 1 ORDER BY CAST(u."totalAffiliateEarnings" AS NUMERIC) DESC LIMIT 10`;

          const allRanksForLeaderboard = await db.affiliateRank.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          });

          const sortedAffiliates = topAffiliatesRaw.map(a => ({
            id: a.id,
            nameInitial: a.name ? a.name.charAt(0).toUpperCase() : '?',
            totalEarnings: d(a.totalAffiliateEarnings),
            totalReferrals: Number(a.referralCount),
            rankName: '',
          }));

          for (const aff of sortedAffiliates) {
            const ranksD = [...allRanksForLeaderboard].sort((a, b) => b.sortOrder - a.sortOrder);
            for (const rank of ranksD) {
              if (aff.totalReferrals >= rank.minReferrals && aff.totalEarnings >= d(rank.minEarnings)) {
                aff.rankName = rank.name;
                break;
              }
            }
          }

          return sortedAffiliates.map((aff, index) => ({
            rank: index + 1,
            nameInitial: aff.nameInitial,
            totalEarnings: aff.totalEarnings,
            totalReferrals: aff.totalReferrals,
            currentRankName: aff.rankName || null,
          }));
        } catch (e) {
          console.error('[Affiliate] Error loading leaderboard:', e);
        }
        return result;
      })(),

      // Badges with auto-award
      (async () => {
        const result: BadgeWithStatus[] = [];
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
            } catch {
              // Invalid requirement format
            }

            if (qualifies) {
              badgesToAward.push(badge.id);
            }
          }

          // Award qualifying badges in a transaction to prevent double-crediting
          if (badgesToAward.length > 0) {
            try {
              await db.$transaction(async (tx) => {
                for (const badgeId of badgesToAward) {
                  const existing = await tx.affiliateBadgeAward.findUnique({
                    where: { userId_badgeId: { userId: session.userId, badgeId } },
                  });

                  if (existing) continue;

                  await tx.affiliateBadgeAward.create({
                    data: { userId: session.userId, badgeId },
                  });

                  awardedMap.set(badgeId, new Date());

                  const badge = allBadges.find(b => b.id === badgeId);
                  if (badge && badge.rewardType === 'cash') {
                    const rewardValue = d(badge.rewardValue);
                    if (rewardValue > 0) {
                      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST((CAST("affiliateBalance" AS NUMERIC) + ${rewardValue}) AS TEXT), "totalAffiliateEarnings" = CAST((CAST("totalAffiliateEarnings" AS NUMERIC) + ${rewardValue}) AS TEXT) WHERE id = ${session.userId}`;
                      await tx.transaction.create({
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
              });
            } catch (awardErr) {
              console.error('[Affiliate] Error auto-awarding badges:', awardErr);
            }
          }

          return allBadges.map(badge => {
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
            } catch {
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
        return result;
      })(),

      // Affiliate levels
      (async () => {
        try {
          return await db.affiliateLevel.findMany({
            where: { isActive: true },
            orderBy: { level: 'asc' },
          });
        } catch (e) {
          console.error('[Affiliate] Error loading affiliate levels:', e);
          return [];
        }
      })(),
    ]);

    // Unpack parallel results
    const referralTree = referralTreeResult;
    const commissionByLevel = commissionByLevelResult;
    const recentCommissions = recentCommissionsResult;
    const modeInfo = modeInfoResult;
    const { ranks, currentRank, nextRank } = ranksResult;
    const milestonesWithStatus = milestonesResult;
    const contests = contestsResult;
    const leaderboard = leaderboardResult;
    const badgesWithStatus = badgesResult;
    const affiliateLevels = affiliateLevelsResult;

    const totalReferrals = Object.values(referralTree).reduce((sum, refs) => sum + refs.length, 0);

    // =====================================================================
    // RANK UPGRADE BONUS — depends on currentRank (after parallel batch)
    // =====================================================================
    if (currentRank && d(currentRank.bonusAmount) > 0) {
      try {
        const rankBadgeExists = await db.affiliateBadgeAward.findFirst({
          where: {
            userId: session.userId,
            badge: {
              name: `rank_${currentRank.name.toLowerCase()}`,
            },
          },
        });

        if (!rankBadgeExists) {
          const bonus = d(currentRank.bonusAmount);
          await db.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST((CAST("affiliateBalance" AS NUMERIC) + ${bonus}) AS TEXT), "totalAffiliateEarnings" = CAST((CAST("totalAffiliateEarnings" AS NUMERIC) + ${bonus}) AS TEXT) WHERE id = ${session.userId}`;

          const rankBadge = await db.affiliateBadge.findFirst({
            where: { name: `rank_${currentRank.name.toLowerCase()}` },
          });

          if (rankBadge) {
            await db.affiliateBadgeAward.create({
              data: { userId: session.userId, badgeId: rankBadge.id },
            });
          }

          await db.transaction.create({
            data: {
              userId: session.userId,
              type: 'affiliate_commission',
              amount: ds(bonus),
              status: 'completed',
              description: `Bônus de rank: ${currentRank.name} (+$${bonus.toFixed(2)} USDT)`,
            },
          });
        }
      } catch (e) {
        console.error('[Affiliate] Error crediting rank bonus:', e);
      }
    }

    // Check if affiliate link requires investment (admin configurable)
    const linkRequiresInvestmentConfig = await db.systemConfig.findUnique({
      where: { key: 'affiliate_link_requires_investment' },
    });
    const linkRequiresInvestment = linkRequiresInvestmentConfig?.value !== 'false'; // default true

    // If link doesn't require investment and user doesn't have linkUnlocked, auto-unlock it
    let effectiveLinkUnlocked = user.linkUnlocked;
    if (!linkRequiresInvestment && !user.linkUnlocked && user.affiliateCode) {
      effectiveLinkUnlocked = true;
    }

    return apiSuccess({
      affiliate: {
        code: user.affiliateCode,
        linkUnlocked: effectiveLinkUnlocked,
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
    let body: Record<string, unknown> = {};
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
      const milestoneId = String(body.milestoneId || '');

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

      // Claim the milestone and update balance atomically
      const claim = await db.$transaction(async (tx) => {
        const claimRecord = await tx.affiliateMilestoneClaim.create({
          data: {
            userId: session.userId,
            milestoneId,
          },
        });

        // If reward is cash, add to user balance
        if (milestone.rewardType === 'cash') {
          const rewardValue = d(milestone.rewardValue);
          if (rewardValue > 0) {
            await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST((CAST("affiliateBalance" AS NUMERIC) + ${rewardValue}) AS TEXT), "totalAffiliateEarnings" = CAST((CAST("totalAffiliateEarnings" AS NUMERIC) + ${rewardValue}) AS TEXT) WHERE id = ${session.userId}`;

            await tx.transaction.create({
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

        return claimRecord;
      });

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

    // Check if affiliate link requires investment (admin configurable)
    const linkRequiresInvestment = await db.systemConfig.findUnique({
      where: { key: 'affiliate_link_requires_investment' },
    });
    const requiresInvestment = linkRequiresInvestment?.value !== 'false'; // default true

    if (requiresInvestment && !user.hasInvested) {
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
