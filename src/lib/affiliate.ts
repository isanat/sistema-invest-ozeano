import { db } from './db';
import { d } from './auth';

// ============================================================================
// AFFILIATE SERVICE - Sustainable Commission Engine v3
// ============================================================================
//
// ECONOMIC PRINCIPLE:
// The platform receives investment amounts as capital. Daily ROI is distributed
// to investors based on copy trading performance. The gap between
// (total invested capital) and (total ROI payouts + withdrawals) determines
// the system's sustainability.
//
// SUSTAINABILITY RULES:
// 1. Commissions must NEVER cause the system to pay out more than it earns
// 2. Commissions come from the SYSTEM's margin, not from user payouts
// 3. A daily cap prevents runaway payouts when many investments are active
// 4. The system always retains a minimum reserve percentage
//
// THREE COMMISSION MODES:
//
// 1. SYSTEM_MARGIN (RECOMMENDED - most sustainable):
//    Commission calculated on the system's profit margin only.
//    When an investment generates ROI and system margin is 30%,
//    affiliates get their % of the system margin, NOT of the full ROI.
//    → Sustainable: commissions come from actual system profit.
//
// 2. INVESTMENT_PROFIT (attractive but higher risk):
//    Commission on investment profits + small investment signup bonus.
//    → CAUTION: This pays affiliates from user trading returns,
//      adding to system outflow. Only sustainable if trading returns
//      are less than investment revenue (system has margin).
//
// 3. REVENUE_POOL (predictable, capped):
//    Fixed % of investment revenue → affiliate pool, distributed by level.
//    → Sustainable because pool can NEVER exceed X% of revenue.
// ============================================================================

const MAX_DEPTH = 11;

// Default level percentages for 11-level affiliate system
// L1=10%, L2=4%, L3=3%, L4=2%, L5=1.5%, L6=1%, L7=0.8%, L8=0.5%, L9=0.4%, L10=0.3%, L11=0.5%
const DEFAULT_LEVEL_PERCENTAGES: Record<number, number> = {
  1: 10,
  2: 4,
  3: 3,
  4: 2,
  5: 1.5,
  6: 1,
  7: 0.8,
  8: 0.5,
  9: 0.4,
  10: 0.3,
  11: 0.5,
};

// Minimum system reserve: system must retain at least this % of daily revenue
const MIN_SYSTEM_RESERVE_PCT = 15;

export type CommissionMode = 'system_margin' | 'investment_profit' | 'revenue_pool';

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
  const depositRecords = await db.deposit.findMany({
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
  investmentBonusPct: number;
  dailyCapUsd: number;
}> {
  const configs = await db.systemConfig.findMany({
    where: {
      key: {
        in: [
          'affiliate_commission_mode',
          'affiliate_system_margin_pct',
          'affiliate_pool_revenue_pct',
          'affiliate_investment_bonus_pct',
          'affiliate_daily_cap_usd',
        ],
      },
    },
  });
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  // DEFAULT: system_margin (most sustainable mode)
  const mode = (configMap.affiliate_commission_mode || 'system_margin') as CommissionMode;
  const validModes: CommissionMode[] = ['system_margin', 'investment_profit', 'revenue_pool'];

  return {
    mode: validModes.includes(mode) ? mode : 'system_margin',
    systemMarginPct: d(configMap.affiliate_system_margin_pct || '30'),
    poolRevenuePct: d(configMap.affiliate_pool_revenue_pct || '5'),
    investmentBonusPct: d(configMap.affiliate_investment_bonus_pct || '2'),
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
  investmentAmount: number,
  systemMarginPct: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  // System profit = investment amount × margin %
  const systemProfit = investmentAmount * (systemMarginPct / 100);

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
// MODE 2: INVESTMENT PROFIT + INVESTMENT BONUS
// ⚠️ CAUTION: Higher risk - commissions add to system outflow
// ============================================================================

function calculateInvestmentProfitCommission(
  investmentProfit: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  return levels
    .filter((l) => l.isActive)
    .map((levelConfig) => {
      const percentage = d(levelConfig.percentage);
      const commissionAmount = investmentProfit * (percentage / 100);
      return {
        userId: '',
        level: levelConfig.level,
        baseAmount: investmentProfit,
        percentage,
        commissionAmount,
        mode: 'investment_profit' as CommissionMode,
        rankBoost: 0,
      };
    });
}

// Investment bonus: immediate commission on investment purchase (smaller %)
function calculateInvestmentBonusCommission(
  investmentAmount: number,
  bonusPct: number,
  levels: Array<{ level: number; percentage: string; isActive: boolean }>,
): CommissionResult[] {
  const bonusBase = investmentAmount * (bonusPct / 100);

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
        mode: 'investment_profit' as CommissionMode,
        rankBoost: 0,
      };
    });
}

// ============================================================================
// MODE 3: REVENUE POOL
// Fixed % of investment revenue → affiliate pool, distributed by level
// ============================================================================

async function processRevenuePoolCommission(
  fromUserId: string,
  investmentAmount: number,
  poolRevenuePct: number,
  sourceId: string,
): Promise<void> {
  const poolContribution = investmentAmount * (poolRevenuePct / 100);

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
          investmentId: sourceId,
        },
      });

      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST((CAST("affiliateBalance" AS NUMERIC) + ${commissionAmount}) AS TEXT), "totalAffiliateEarnings" = CAST((CAST("totalAffiliateEarnings" AS NUMERIC) + ${commissionAmount}) AS TEXT) WHERE id = ${referrer.id}`;

      await tx.transaction.create({
        data: {
          userId: referrer.id,
          type: 'affiliate_commission',
          amount: commissionAmount.toFixed(8),
          status: 'completed',
          description: `Pool receita nível ${referrer.level} (${poolRevenuePct}% da receita)${rankBoost > 0 ? ` +${rankBoost}% rank` : ''}`,
          referenceId: sourceId,
          referenceType: 'Investment',
        },
      });
    }
  });
}

// ============================================================================
// WALK UP REFERRAL CHAIN (shared by modes 1 & 2)
// With sustainability cap - supports 11 levels
// ============================================================================

async function walkUpReferralChain(
  fromUserId: string,
  commissionTemplate: CommissionResult[],
  sourceType: 'trading' | 'subscription',
  sourceId: string,
  isInvestmentBonus: boolean = false,
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
          investmentId: sourceId,
        },
      });

      await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST((CAST("affiliateBalance" AS NUMERIC) + ${scaledCommission}) AS TEXT), "totalAffiliateEarnings" = CAST((CAST("totalAffiliateEarnings" AS NUMERIC) + ${scaledCommission}) AS TEXT) WHERE id = ${ref.id}`;

      const modeLabel = isInvestmentBonus
        ? `Bônus investimento (${ref.percentage}% do bônus)`
        : mode === 'system_margin'
          ? `Margem do sistema (${ref.percentage}% da margem)`
          : `Lucro investimento (${ref.percentage}%)`;

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
          referenceType: sourceType === 'trading' ? 'RoiHistory' : 'Investment',
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
  sourceType: 'trading' | 'subscription' | 'deposit',
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
    // Trading commissions: % of the system's share of trading revenue
    // Investment commissions: % of the system's margin on the investment
    // NO commission on deposit
    // ====================================================================
    case 'system_margin': {
      if (sourceType === 'deposit') {
        return;
      }

      if (sourceType === 'subscription') {
        const template = calculateSystemMarginCommission(
          earningsAmount,
          config.systemMarginPct,
          levels,
        );
        await walkUpReferralChain(fromUserId, template, 'subscription', sourceId);
      } else {
        // Trading: commission on system's share (margin) of the ROI profit
        // This ensures affiliates earn from what the SYSTEM earns, not from user payouts
        const template = calculateSystemMarginCommission(
          earningsAmount, // base amount for record
          config.systemMarginPct,
          levels,
        );
        await walkUpReferralChain(fromUserId, template, 'trading', sourceId);
      }
      break;
    }

    // ====================================================================
    // MODE 2: INVESTMENT_PROFIT + INVESTMENT BONUS (higher risk)
    // ⚠️ CAUTION: Commissions add to system outflow
    // Investment commission: % of user's investment profit (ADDS to daily outflow)
    // Investment bonus: % of investment amount (immediate, smaller)
    // ====================================================================
    case 'investment_profit': {
      if (sourceType === 'deposit') {
        return;
      }

      if (sourceType === 'subscription') {
        if (config.investmentBonusPct > 0) {
          const bonusTemplate = calculateInvestmentBonusCommission(
            earningsAmount,
            config.investmentBonusPct,
            levels,
          );
          await walkUpReferralChain(fromUserId, bonusTemplate, 'subscription', sourceId, true);
        }
      } else if (sourceType === 'trading') {
        const template = calculateInvestmentProfitCommission(earningsAmount, levels);
        await walkUpReferralChain(fromUserId, template, 'trading', sourceId);
      }
      break;
    }

    // ====================================================================
    // MODE 3: REVENUE_POOL (predictable, capped)
    // Fixed % of investment revenue → affiliate pool, distributed by level
    // ====================================================================
    case 'revenue_pool': {
      if (sourceType !== 'subscription') {
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
  sourceType: 'trading' | 'subscription' | 'deposit',
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
      if (config.mode === 'system_margin' && sourceType === 'subscription') {
        baseAmount = earningsAmount * (config.systemMarginPct / 100);
      } else if (config.mode === 'revenue_pool' && sourceType === 'subscription') {
        baseAmount = earningsAmount * (config.poolRevenuePct / 100);
      } else if (config.mode === 'investment_profit' && sourceType === 'subscription') {
        baseAmount = earningsAmount * (config.investmentBonusPct / 100);
      } else if (config.mode === 'investment_profit' && sourceType !== 'trading') {
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
  investmentBonusPct: number;
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

/**
 * Get default level percentages for the 11-level affiliate system.
 * L1=10%, L2=4%, L3=3%, L4=2%, L5=1.5%, L6=1%, L7=0.8%, L8=0.5%, L9=0.4%, L10=0.3%, L11=0.5%
 * Total = 23.5%
 */
export function getDefaultLevelPercentages(): Record<number, number> {
  return { ...DEFAULT_LEVEL_PERCENTAGES };
}

/**
 * Get the team bonus percentage for a user based on direct referrals with investments.
 * Queries the AffiliateRank table dynamically to match the configured rank thresholds.
 * Falls back to Bronze (1+ referrals) = 1%, Prata (5+) = 2%, Ouro (15+) = 3%
 */
export async function getTeamBonusPct(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      totalAffiliateEarnings: true,
    },
  });

  if (!user) return 0;

  const directReferrals = await db.user.count({
    where: { referredBy: userId, hasInvested: true },
  });

  const userEarnings = d(user.totalAffiliateEarnings);

  // Query ranks from DB (same logic as getRankBoost but for team bonus based on referrals)
  const ranks = await db.affiliateRank.findMany({
    where: { isActive: true },
    orderBy: { minReferrals: 'desc' },
  });

  for (const rank of ranks) {
    if (directReferrals >= rank.minReferrals && userEarnings >= d(rank.minEarnings)) {
      return d(rank.commissionBoost);
    }
  }

  return 0;
}
