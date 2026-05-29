// ============================================================================
// TEAM BONUS SERVICE — AC-09 (Weekly Salary), AC-10 (Action Gold), AC-11 (Daymond)
// ============================================================================
// Central functions shared by cron jobs, user API, and admin API.
//
// KEY DESIGN DECISIONS:
// 1. Daymond investments (source='daymond') do NOT count toward team capital
//    → Prevents inflation cascade (virtual money generating more virtual money)
// 2. Action Gold is calculated ONLY on WeeklySalary base, never on other Gold
//    → Prevents infinite cascade up the referral chain
// 3. All thresholds/percentages are configurable via SystemConfig category 'team_bonus'
// 4. Idempotency via unique constraints on (userId, weekDate/monthDate)
// ============================================================================

import { db } from './db';
import { d } from './auth';

// ============================================================================
// CONFIG: Load all team bonus settings from SystemConfig
// ============================================================================

export interface TeamBonusConfig {
  salaryEnabled: boolean;
  salaryPct: number;
  salaryMinTeamCapital: number;
  salaryRequiresOwnInvestment: boolean;
  goldEnabled: boolean;
  goldPct: number;
  goldMinTeamCapital: number;
  daymondEnabled: boolean;
  daymondPackageAmount: number;
  daymondMinTeamCapital: number;
  daymondDurationDays: number;
  daymondGeneratesCommissions: boolean;
  daymondPremiumEnabled: boolean;
  daymondPremiumPackageAmount: number;
  daymondPremiumMinTeamCapital: number;
  daymondPremiumDailyRoiPct: number;
  daymondPremiumDailyCapUsd: number;
  dailyCapUsd: number;
  maxDepth: number;
}

export async function getTeamBonusConfig(): Promise<TeamBonusConfig> {
  const configs = await db.systemConfig.findMany({
    where: { category: 'team_bonus', isActive: true },
  });
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;

  return {
    salaryEnabled: map.team_bonus_salary_enabled === 'true',
    salaryPct: d(map.team_bonus_salary_pct || '0.5'),
    salaryMinTeamCapital: d(map.team_bonus_salary_min_team_capital || '2000'),
    salaryRequiresOwnInvestment: map.team_bonus_salary_requires_own_investment !== 'false',
    goldEnabled: map.team_bonus_gold_enabled === 'true',
    goldPct: d(map.team_bonus_gold_pct || '50'),
    goldMinTeamCapital: d(map.team_bonus_gold_min_team_capital || '4000'),
    daymondEnabled: map.team_bonus_daymond_enabled === 'true',
    daymondPackageAmount: d(map.team_bonus_daymond_package_amount || '1000'),
    daymondMinTeamCapital: d(map.team_bonus_daymond_min_team_capital || '20000'),
    daymondDurationDays: parseInt(map.team_bonus_daymond_duration_days || '30'),
    daymondGeneratesCommissions: map.team_bonus_daymond_generates_commissions === 'true',
    daymondPremiumEnabled: map.team_bonus_daymond_premium_enabled === 'true',
    daymondPremiumPackageAmount: d(map.team_bonus_daymond_premium_package_amount || '2000'),
    daymondPremiumMinTeamCapital: d(map.team_bonus_daymond_premium_min_team_capital || '50000'),
    daymondPremiumDailyRoiPct: d(map.team_bonus_daymond_premium_daily_roi_pct || '3.3'),
    daymondPremiumDailyCapUsd: d(map.team_bonus_daymond_premium_daily_cap_usd || '99'),
    dailyCapUsd: d(map.team_bonus_daily_cap_usd || '0'),
    maxDepth: parseInt(map.team_bonus_max_depth || '6'),
  };
}

// ============================================================================
// CORE: Calculate team's active capital (used by all 3 features)
// ============================================================================
// Walks down the referral tree up to maxDepth levels.
// Sums all active investments EXCEPT source='daymond' (anti-inflation).
// The user's OWN investments are NOT included — only referrals.
// ============================================================================

export async function calculateTeamActiveCapital(
  userId: string,
  maxDepth: number = 6
): Promise<number> {
  let totalCapital = 0;
  let currentLevelIds = [userId];
  const visited = new Set<string>([userId]);

  for (let level = 1; level <= maxDepth; level++) {
    // Find all direct referrals of the current level's users
    const referrals = await db.user.findMany({
      where: {
        referredBy: { in: currentLevelIds },
        isActive: true,
        id: { notIn: Array.from(visited) },
      },
      select: { id: true },
    });

    if (referrals.length === 0) break; // No more levels

    const referralIds = referrals.map(r => r.id);
    referralIds.forEach(id => visited.add(id));

    // Sum active investments of these referrals, EXCLUDING daymond source
    // CRITICAL: source != 'daymond' prevents inflation cascade
    const result = await db.investment.aggregate({
      _sum: { amount: true },
      where: {
        userId: { in: referralIds },
        status: 'active',
        source: { notIn: ['daymond', 'daymond_premium'] },
      },
    });

    totalCapital += d(result._sum.amount || '0');
    currentLevelIds = referralIds;
  }

  return totalCapital;
}

// ============================================================================
// HELPER: Check if user has an active investment (deposit or voucher funded)
// ============================================================================

export async function hasActiveInvestment(userId: string): Promise<boolean> {
  const count = await db.investment.count({
    where: {
      userId,
      status: 'active',
      source: { in: ['deposit', 'voucher', 'reinvestment'] },
    },
  });
  return count > 0;
}

// ============================================================================
// SUSTAINABILITY: Check daily team bonus cap
// ============================================================================

export async function checkTeamBonusDailyCap(
  proposedAmount: number
): Promise<{ allowed: boolean; cappedAmount: number; reason?: string }> {
  const config = await getTeamBonusConfig();

  if (config.dailyCapUsd <= 0) {
    return { allowed: true, cappedAmount: proposedAmount };
  }

  // Calculate today's total team bonus already paid
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Sum from WeeklySalary
  const salaryPayments = await db.weeklySalary.findMany({
    where: { createdAt: { gte: today }, status: 'paid' },
    select: { salaryAmount: true },
  });

  // Sum from ActionGoldPayment
  const goldPayments = await db.actionGoldPayment.findMany({
    where: { createdAt: { gte: today }, status: 'paid' },
    select: { goldAmount: true },
  });

  const todayTotal =
    salaryPayments.reduce((sum, s) => sum + d(s.salaryAmount), 0) +
    goldPayments.reduce((sum, g) => sum + d(g.goldAmount), 0);

  if (todayTotal + proposedAmount > config.dailyCapUsd) {
    const remaining = Math.max(0, config.dailyCapUsd - todayTotal);
    if (remaining <= 0) {
      return { allowed: false, cappedAmount: 0, reason: `Cap diário de bônus atingido ($${config.dailyCapUsd.toFixed(2)})` };
    }
    return { allowed: true, cappedAmount: remaining, reason: `Cap parcial ($${remaining.toFixed(2)} restante)` };
  }

  return { allowed: true, cappedAmount: proposedAmount };
}

// ============================================================================
// HELPER: Get last Sunday at 00:00 UTC
// ============================================================================

export function getLastSunday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setUTCDate(sunday.getUTCDate() - diff);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday;
}

// ============================================================================
// HELPER: Get first day of current month at 00:00 UTC
// ============================================================================

export function getFirstOfMonth(): Date {
  const now = new Date();
  const first = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  first.setUTCHours(0, 0, 0, 0);
  return first;
}

// ============================================================================
// HELPER: Count team members at each level (for user display)
// ============================================================================

export async function getTeamStats(userId: string, maxDepth: number = 6): Promise<{
  totalMembers: number;
  totalActiveCapital: number;
  levels: Array<{ level: number; members: number; activeCapital: number }>;
}> {
  let totalMembers = 0;
  let totalActiveCapital = 0;
  const levels: Array<{ level: number; members: number; activeCapital: number }> = [];
  let currentLevelIds = [userId];
  const visited = new Set<string>([userId]);

  for (let level = 1; level <= maxDepth; level++) {
    const referrals = await db.user.findMany({
      where: {
        referredBy: { in: currentLevelIds },
        isActive: true,
        id: { notIn: Array.from(visited) },
      },
      select: { id: true },
    });

    if (referrals.length === 0) break;

    const referralIds = referrals.map(r => r.id);
    referralIds.forEach(id => visited.add(id));

    const capitalResult = await db.investment.aggregate({
      _sum: { amount: true },
      where: {
        userId: { in: referralIds },
        status: 'active',
        source: { notIn: ['daymond', 'daymond_premium'] },
      },
    });

    const levelCapital = d(capitalResult._sum.amount || '0');
    totalMembers += referrals.length;
    totalActiveCapital += levelCapital;

    levels.push({ level, members: referrals.length, activeCapital: levelCapital });
    currentLevelIds = referralIds;
  }

  return { totalMembers, totalActiveCapital, levels };
}

// ============================================================================
// HELPER: Count direct referrals who received weekly salary this week
// (Used to estimate Action Gold for user display)
// ============================================================================

export async function getDirectsSalaryInfo(userId: string, weekDate: Date): Promise<{
  count: number;
  totalSalary: number;
}> {
  const directReferrals = await db.user.findMany({
    where: { referredBy: userId, isActive: true },
    select: { id: true },
  });

  if (directReferrals.length === 0) return { count: 0, totalSalary: 0 };

  const directIds = directReferrals.map(r => r.id);

  const salaries = await db.weeklySalary.findMany({
    where: {
      userId: { in: directIds },
      weekDate,
      status: 'paid',
    },
    select: { salaryAmount: true },
  });

  return {
    count: salaries.length,
    totalSalary: salaries.reduce((sum, s) => sum + d(s.salaryAmount), 0),
  };
}
