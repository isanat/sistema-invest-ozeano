import { db } from './db';
import { d } from './auth';

// ============================================================================
// AFFILIATE SERVICE - Sustainable Commission Engine v2
// ============================================================================
//
// ECONOMIC PRINCIPLE:
// The system receives rental payments as revenue. Mining profits are distributed
// to users daily. The gap between (total rental revenue) and (total mining payouts)
// determines the system's sustainability.
//
// SUSTAINABILITY RULES:
// 1. Commissions must NEVER cause the system to pay out more than it earns
// 2. Commissions come from the SYSTEM's margin, not from user payouts
// 3. A daily cap prevents runaway payouts when many rentals are active
// 4. The system always retains a minimum reserve percentage
//
// THREE COMMISSION MODES:
//
// 1. SYSTEM_MARGIN (RECOMMENDED - most sustainable):
//    Commission calculated on the system's profit margin only.
//    When a rental earns $3.64/day and system margin is 30% ($1.09),
//    affiliates get their % of $1.09, NOT of $3.64.
//    → Sustainable: commissions come from actual system profit.
//
// 2. MINING_PROFIT (attractive but higher risk):
//    Commission on mining profits + small rental signup bonus.
//    → CAUTION: This pays affiliates from user mining returns,
//      adding to system outflow. Only sustainable if mining returns
//      are less than rental revenue (system has margin).
//
// 3. REVENUE_POOL (predictable, capped):
//    Fixed % of rental revenue → affiliate pool, distributed by level.
//    → Sustainable because pool can NEVER exceed X% of revenue.
// ============================================================================

const MAX_DEPTH = 5;

// Minimum system reserve: system must retain at least this % of daily revenue
const MIN_SYSTEM_RESERVE_PCT = 15;

export type CommissionMode = 'system_margin' | 'mining_profit' | 'revenue_pool';

interface CommissionResult {
  userId: string;
  level: number;
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  mode: CommissionMode;
  rankBoost: number;
}

// ============================================================================
// SUSTAINABILITY CHECK: Ensure daily affiliate payouts don't exceed safe limits
// ============================================================================

async function checkDailyCommissionCap(
  proposedAmount: number,
): Promise<{ allowed: boolean; cappedAmount: number; reason?: string }> {
  // Get the daily cap from SystemConfig (0 = no cap)
  const capConfig = await db.systemConfig.findUnique({
    where: { key: 'affiliate_daily_cap_usd' },
  });
  const dailyCap = capConfig ? d(capConfig.value) : 0; // 0 = no explicit cap

  // Calculate today's total commissions already paid
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayCommissions = await db.affiliateCommission.findMany({
    where: {
      createdAt: { gte: today },
      status: 'paid',
    },
    select: { commissionAmount: true },
  });

  const todayTotal = todayCommissions.reduce((sum, c) => sum + d(c.commissionAmount), 0);

  // Check explicit cap
  if (dailyCap > 0 && todayTotal + proposedAmount > dailyCap) {
    const remaining = Math.max(0, dailyCap - todayTotal);
    if (remaining <= 0) {
      return { allowed: false, cappedAmount: 0, reason: `Cap diário atingido ($${dailyCap.toFixed(2)})` };
    }
    return { allowed: true, cappedAmount: remaining, reason: `Cap diário parcial ($${remaining.toFixed(2)} restante)` };
  }

  // Check sustainability: total affiliate payouts should not exceed (100% - MIN_SYSTEM_RESERVE) of deposits
  // This is a soft check - if system has ample reserves, allow through
  const totalDeposits = await db.investment.aggregate({
    _count: { id: true },
    where: { type: 'deposit', status: 'confirmed' },
  });

  // Get total deposits amount manually (amount is String)
  const depositRecords = await db.investment.findMany({
    where: { type: 'deposit', status: 'confirmed' },
    select: { amount: true },
  });
  const totalDepositAmount = depositRecords.reduce((sum, dep) => sum + d(dep.amount), 0);

  // Get total affiliate earnings already paid
  const allCommissions = await db.affiliateCommission.findMany({
    where: { status: 'paid' },
    select: { commissionAmount: true },
  });
  const totalAffiliatePaid = allCommissions.reduce((sum, c) => sum + d(c.commissionAmount), 0);

  // Max allowed affiliate payouts = deposits * (1 - MIN_SYSTEM_RESERVE_PCT/100)
  const maxAffiliatePayouts = totalDepositAmount * (1 - MIN_SYSTEM_RESERVE_PCT / 100);

  if (totalAffiliatePaid + proposedAmount > maxAffiliatePayouts) {
    const remaining = Math.max(0, maxAffiliatePayouts - totalAffiliatePaid);
    if (remaining <= 0) {
      return { allowed: false, cappedAmount: 0, reason: 'Reserva mínima do sistema atingida' };
    }
    return { allowed: true, cappedAmount: Math.min(proposedAmount, remaining), reason: 'Ajustado para manter reserva' };
  }

  return { allowed: true, cappedAmount: proposedAmount };
}

// ============================================================================
// CONFIG HELPERS
// ============================================================================

async function getAffiliateConfig(): Promise<{
  mode: CommissionMode;
  systemMarginPct: number;
  poolRevenuePct: number;
  rentalBonusPct: number;
  dailyCapUsd: number;
}> {
  const configs = await db.systemConfig.findMany({
    where: {
      key: {
        in: [
          'affiliate_commission_mode',
          'affiliate_system_margin_pct',
          'affiliate_pool_revenue_pct',
          'affiliate_rental_bonus_pct',
          'affiliate_daily_cap_usd',
        ],
      },
    },
  });
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  // DEFAULT: system_margin (most sustainable mode)
  const mode = (configMap.affiliate_commission_mode || 'system_margin') as CommissionMode;
  const validModes: CommissionMode[] = ['system_margin', 'mining_profit', 'revenue_pool'];

  return {
    mode: validModes.includes(mode) ? mode : 'system_margin',
    systemMarginPct: d(configMap.affiliate_system_margin_pct || '30'),
    poolRevenuePct: d(configMap.affiliate_pool_revenue_pct || '5'),
    rentalBonusPct: d(configMap.affiliate_rental_bonus_pct || '2'),
    dailyCapUsd: d(configMap.affiliate_daily_cap_usd || '0'),
  };
}

// ============================================================================
// RANK BOOST: Get the commission boost % for a user based on their rank
// ============================================================================

async function getRankBoost(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      totalAffiliateEarnings: true,
      referrals: { select: { id: true } },
    },
  });

  if (!user) return 0;

  const totalReferrals = user.referrals.length;
  const totalEarnings = d(user.totalAffiliateEarnings);

  const ranks = await db.affiliateRank.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'desc' },
  });

  for (const rank of ranks) {
    if (totalReferrals >= rank.minReferrals && totalEarnings >= d(rank.minEarnings)) {
      return d(rank.commissionBoost);
    }
  }

  return 0;
}

// ============================================================================
// MODE 1: SYSTEM MARGIN (RECOMMENDED - Most Sustainable)
// Commission on system's profit margin only
// ============================================================================

function calculateSystemMarginCommission(
  rentalAmount: number,
  systemMarginPct: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  // System profit = rental amount × margin %
  const systemProfit = rentalAmount * (systemMarginPct / 100);

  return levels
    .filter((l) => l.isActive)
    .map((levelConfig) => {
      const percentage = d(levelConfig.percentage);
      const commissionAmount = systemProfit * (percentage / 100);
      return {
        userId: '',
        level: levelConfig.level,
        baseAmount: systemProfit,
        percentage,
        commissionAmount,
        mode: 'system_margin' as CommissionMode,
        rankBoost: 0,
      };
    });
}

// ============================================================================
// MODE 2: MINING PROFIT + RENTAL BONUS
// ⚠️ CAUTION: Higher risk - commissions add to system outflow
// ============================================================================

function calculateMiningProfitCommission(
  miningProfit: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  return levels
    .filter((l) => l.isActive)
    .map((levelConfig) => {
      const percentage = d(levelConfig.percentage);
      const commissionAmount = miningProfit * (percentage / 100);
      return {
        userId: '',
        level: levelConfig.level,
        baseAmount: miningProfit,
        percentage,
        commissionAmount,
        mode: 'mining_profit' as CommissionMode,
        rankBoost: 0,
      };
    });
}

// Rental bonus: immediate commission on rental purchase (smaller %)
function calculateRentalBonusCommission(
  rentalAmount: number,
  bonusPct: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  const bonusBase = rentalAmount * (bonusPct / 100);

  return levels
    .filter((l) => l.isActive)
    .map((levelConfig) => {
      const percentage = d(levelConfig.percentage);
      const commissionAmount = bonusBase * (percentage / 100);
      return {
        userId: '',
        level: levelConfig.level,
        baseAmount: bonusBase,
        percentage,
        commissionAmount,
        mode: 'mining_profit' as CommissionMode,
        rankBoost: 0,
      };
    });
}

// ============================================================================
// MODE 3: REVENUE POOL
// Fixed % of rental revenue → affiliate pool, distributed by level
// ============================================================================

async function processRevenuePoolCommission(
  fromUserId: string,
  rentalAmount: number,
  poolRevenuePct: number,
  sourceId: string,
): Promise<void> {
  const poolContribution = rentalAmount * (poolRevenuePct / 100);

  // Sustainability check before distributing pool
  const sustainability = await checkDailyCommissionCap(poolContribution);
  if (!sustainability.allowed) {
    console.warn(`[Affiliate] Revenue pool blocked: ${sustainability.reason}`);
    return;
  }
  const actualPool = sustainability.cappedAmount;
  if (actualPool <= 0) return;

  const levels = await db.affiliateLevel.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });

  if (levels.length === 0) return;

  const totalPct = levels.reduce((sum, l) => sum + d(l.percentage), 0);
  if (totalPct === 0) return;

  const referrers: Array<{
    id: string;
    level: number;
    weight: number;
  }> = [];

  let currentUserId: string | null = fromUserId;
  let depth = 0;

  while (currentUserId && depth < MAX_DEPTH) {
    depth++;
    const levelIndex = depth - 1;
    if (levelIndex >= levels.length) break;

    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, referredBy: true, hasInvested: true, linkUnlocked: true },
    });

    if (!currentUser?.referredBy) break;

    const referrer = await db.user.findUnique({
      where: { id: currentUser.referredBy },
      select: { id: true, hasInvested: true, linkUnlocked: true },
    });

    if (!referrer) break;

    if (referrer.hasInvested && referrer.linkUnlocked) {
      const levelConfig = levels[levelIndex];
      referrers.push({
        id: referrer.id,
        level: levelConfig.level,
        weight: d(levelConfig.percentage),
      });
    }

    currentUserId = referrer.id;
  }

  if (referrers.length === 0) return;

  const totalWeight = referrers.reduce((sum, r) => sum + r.weight, 0);

  await db.$transaction(async (tx) => {
    for (const referrer of referrers) {
      let commissionAmount = actualPool * (referrer.weight / totalWeight);

      const rankBoost = await getRankBoost(referrer.id);
      if (rankBoost > 0) {
        commissionAmount = commissionAmount * (1 + rankBoost / 100);
      }

      if (commissionAmount <= 0) continue;

      await tx.affiliateCommission.create({
        data: {
          userId: referrer.id,
          fromUserId,
          level: referrer.level,
          baseAmount: actualPool,
          percentage: ((referrer.weight / totalWeight) * 100).toFixed(2),
          commissionAmount: commissionAmount.toFixed(8),
          status: 'paid',
          paidAt: new Date(),
          rentalId: sourceId,
        },
      });

      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST(CAST("affiliateBalance" AS REAL) + ${commissionAmount} AS TEXT), "totalAffiliateEarnings" = CAST(CAST("totalAffiliateEarnings" AS REAL) + ${commissionAmount} AS TEXT) WHERE id = ${referrer.id}`;

      await tx.transaction.create({
        data: {
          userId: referrer.id,
          type: 'affiliate_commission',
          amount: commissionAmount.toFixed(8),
          status: 'completed',
          description: `Pool receita nível ${referrer.level} (${poolRevenuePct}% da receita)${rankBoost > 0 ? ` +${rankBoost}% rank` : ''}`,
          referenceId: sourceId,
          referenceType: 'MiningRental',
        },
      });
    }
  });
}

// ============================================================================
// WALK UP REFERRAL CHAIN (shared by modes 1 & 2)
// With sustainability cap
// ============================================================================

async function walkUpReferralChain(
  fromUserId: string,
  commissionTemplate: CommissionResult[],
  sourceType: 'mining' | 'rental',
  sourceId: string,
  isRentalBonus: boolean = false,
): Promise<void> {
  if (commissionTemplate.length === 0) return;

  const levels = await db.affiliateLevel.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });

  if (levels.length === 0) return;

  // Walk up referral chain
  const referrers: Array<{
    id: string;
    level: number;
    commission: number;
    baseAmount: number;
    percentage: number;
    rankBoost: number;
  }> = [];

  let currentUserId: string | null = fromUserId;
  let depth = 0;

  while (currentUserId && depth < MAX_DEPTH) {
    depth++;
    const levelIndex = depth - 1;
    if (levelIndex >= levels.length) break;

    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, referredBy: true, hasInvested: true, linkUnlocked: true },
    });

    if (!currentUser?.referredBy) break;

    const referrer = await db.user.findUnique({
      where: { id: currentUser.referredBy },
      select: { id: true, hasInvested: true, linkUnlocked: true },
    });

    if (!referrer) break;

    if (referrer.hasInvested && referrer.linkUnlocked) {
      const levelConfig = levels[levelIndex];
      const template = commissionTemplate.find((t) => t.level === levelConfig.level);
      if (template) {
        const rankBoost = await getRankBoost(referrer.id);
        let finalCommission = template.commissionAmount;
        if (rankBoost > 0) {
          finalCommission = finalCommission * (1 + rankBoost / 100);
        }

        referrers.push({
          id: referrer.id,
          level: levelConfig.level,
          commission: finalCommission,
          baseAmount: template.baseAmount,
          percentage: template.percentage,
          rankBoost,
        });
      }
    }

    currentUserId = referrer.id;
  }

  if (referrers.length === 0) return;

  // Calculate total proposed commission for sustainability check
  const totalProposed = referrers.reduce((sum, r) => sum + r.commission, 0);

  // Sustainability cap check
  const sustainability = await checkDailyCommissionCap(totalProposed);
  if (!sustainability.allowed) {
    console.warn(`[Affiliate] Commission blocked: ${sustainability.reason}`);
    return;
  }

  // If capped, scale all commissions proportionally
  let scaleFactor = 1;
  if (sustainability.cappedAmount < totalProposed && totalProposed > 0) {
    scaleFactor = sustainability.cappedAmount / totalProposed;
    console.warn(`[Affiliate] Commissions scaled to ${(scaleFactor * 100).toFixed(1)}% (${sustainability.reason})`);
  }

  // Save all commissions in transaction
  const mode = commissionTemplate[0]?.mode || 'system_margin';

  await db.$transaction(async (tx) => {
    for (const ref of referrers) {
      const scaledCommission = ref.commission * scaleFactor;
      if (scaledCommission <= 0.00000001) continue; // Skip dust

      await tx.affiliateCommission.create({
        data: {
          userId: ref.id,
          fromUserId,
          level: ref.level,
          baseAmount: ref.baseAmount.toFixed(8),
          percentage: ref.percentage.toFixed(2),
          commissionAmount: scaledCommission.toFixed(8),
          status: 'paid',
          paidAt: new Date(),
          ...(sourceType === 'mining'
            ? { miningHistoryId: sourceId }
            : { rentalId: sourceId }),
        },
      });

      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST(CAST("affiliateBalance" AS REAL) + ${scaledCommission} AS TEXT), "totalAffiliateEarnings" = CAST(CAST("totalAffiliateEarnings" AS REAL) + ${scaledCommission} AS TEXT) WHERE id = ${ref.id}`;

      const modeLabel = isRentalBonus
        ? `Bônus locação (${ref.percentage}% do bônus)`
        : mode === 'system_margin'
          ? `Margem do sistema (${ref.percentage}% da margem)`
          : `Lucro mineração (${ref.percentage}%)`;

      const boostLabel = ref.rankBoost > 0 ? ` +${ref.rankBoost}% rank` : '';
      const capLabel = scaleFactor < 1 ? ' [ajustado]' : '';

      await tx.transaction.create({
        data: {
          userId: ref.id,
          type: 'affiliate_commission',
          amount: scaledCommission.toFixed(8),
          status: 'completed',
          description: `Comissão nível ${ref.level} - ${modeLabel}${boostLabel}${capLabel}`,
          referenceId: sourceId,
          referenceType: sourceType === 'mining' ? 'MiningHistory' : 'MiningRental',
        },
      });
    }
  });
}

// ============================================================================
// MAIN ENTRY POINT: processCommissions
// Routes to the correct mode's logic with sustainability safeguards
// ============================================================================

export async function processCommissions(
  fromUserId: string,
  earningsAmount: number,
  sourceType: 'mining' | 'rental' | 'deposit',
  sourceId: string,
): Promise<void> {
  // Skip zero or negative amounts
  if (earningsAmount <= 0) return;

  // Get current commission mode config
  const config = await getAffiliateConfig();

  // Get affiliate levels
  const levels = await db.affiliateLevel.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });

  if (levels.length === 0) return;

  switch (config.mode) {
    // ====================================================================
    // MODE 1: SYSTEM_MARGIN (DEFAULT - MOST SUSTAINABLE)
    // Commissions come from the system's profit margin, not user payouts.
    // Mining commissions: % of the system's share of mining revenue
    // Rental commissions: % of the system's margin on the rental
    // NO commission on deposit
    // ====================================================================
    case 'system_margin': {
      if (sourceType === 'deposit') {
        return;
      }

      if (sourceType === 'rental') {
        const template = calculateSystemMarginCommission(
          earningsAmount,
          config.systemMarginPct,
          levels,
        );
        await walkUpReferralChain(fromUserId, template, 'rental', sourceId);
      } else {
        // Mining: commission on system's share (margin) of the mining profit
        // This ensures affiliates earn from what the SYSTEM earns, not from user payouts
        const systemShareOfMining = earningsAmount * (config.systemMarginPct / 100);
        const template = calculateSystemMarginCommission(
          earningsAmount, // base amount for record
          config.systemMarginPct,
          levels,
        );
        await walkUpReferralChain(fromUserId, template, 'mining', sourceId);
      }
      break;
    }

    // ====================================================================
    // MODE 2: MINING_PROFIT + RENTAL BONUS (higher risk)
    // ⚠️ CAUTION: Commissions add to system outflow
    // Mining commission: % of user's mining profit (ADDS to daily outflow)
    // Rental bonus: % of rental amount (immediate, smaller)
    // ====================================================================
    case 'mining_profit': {
      if (sourceType === 'deposit') {
        return;
      }

      if (sourceType === 'rental') {
        if (config.rentalBonusPct > 0) {
          const bonusTemplate = calculateRentalBonusCommission(
            earningsAmount,
            config.rentalBonusPct,
            levels,
          );
          await walkUpReferralChain(fromUserId, bonusTemplate, 'rental', sourceId, true);
        }
      } else if (sourceType === 'mining') {
        const template = calculateMiningProfitCommission(earningsAmount, levels);
        await walkUpReferralChain(fromUserId, template, 'mining', sourceId);
      }
      break;
    }

    // ====================================================================
    // MODE 3: REVENUE_POOL (predictable, capped)
    // Fixed % of rental revenue → affiliate pool, distributed by level
    // ====================================================================
    case 'revenue_pool': {
      if (sourceType !== 'rental') {
        return;
      }

      await processRevenuePoolCommission(
        fromUserId,
        earningsAmount,
        config.poolRevenuePct,
        sourceId,
      );
      break;
    }
  }
}

// ============================================================================
// LEGACY: calculateCommissions (kept for backward compatibility)
// ============================================================================

export async function calculateCommissions(
  fromUserId: string,
  earningsAmount: number,
  sourceType: 'mining' | 'rental' | 'deposit',
  sourceId: string
): Promise<CommissionResult[]> {
  const config = await getAffiliateConfig();
  const levels = await db.affiliateLevel.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });

  if (levels.length === 0) return [];

  const commissions: CommissionResult[] = [];

  let currentUserId: string | null = fromUserId;
  let depth = 0;

  while (currentUserId && depth < MAX_DEPTH) {
    depth++;
    const levelIndex = depth - 1;
    if (levelIndex >= levels.length) break;

    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, referredBy: true, hasInvested: true, linkUnlocked: true },
    });

    if (!currentUser?.referredBy) break;

    const referrer = await db.user.findUnique({
      where: { id: currentUser.referredBy },
      select: { id: true, hasInvested: true, linkUnlocked: true },
    });

    if (!referrer) break;

    if (referrer.hasInvested && referrer.linkUnlocked) {
      const levelConfig = levels[levelIndex];
      const percentage = d(levelConfig.percentage);

      let baseAmount = earningsAmount;
      if (config.mode === 'system_margin' && sourceType === 'rental') {
        baseAmount = earningsAmount * (config.systemMarginPct / 100);
      } else if (config.mode === 'revenue_pool' && sourceType === 'rental') {
        baseAmount = earningsAmount * (config.poolRevenuePct / 100);
      } else if (config.mode === 'mining_profit' && sourceType === 'rental') {
        baseAmount = earningsAmount * (config.rentalBonusPct / 100);
      } else if (config.mode === 'mining_profit' && sourceType !== 'mining') {
        currentUserId = referrer.id;
        continue;
      }

      const rankBoost = await getRankBoost(referrer.id);
      let commissionAmount = baseAmount * (percentage / 100);
      if (rankBoost > 0) {
        commissionAmount = commissionAmount * (1 + rankBoost / 100);
      }

      commissions.push({
        userId: referrer.id,
        level: levelConfig.level,
        baseAmount,
        percentage,
        commissionAmount,
        mode: config.mode,
        rankBoost,
      });
    }

    currentUserId = referrer.id;
  }

  return commissions;
}

// ============================================================================
// Get current affiliate mode config (for frontend display)
// ============================================================================

export async function getAffiliateModeInfo(): Promise<{
  mode: CommissionMode;
  systemMarginPct: number;
  poolRevenuePct: number;
  rentalBonusPct: number;
}> {
  return getAffiliateConfig();
}

/**
 * Generate a unique affiliate code for a user.
 */
export function generateAffiliateCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${random}`;
}
