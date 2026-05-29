// ============================================================================
// GET /api/team-bonus — User's team bonus data (AC-09, AC-10, AC-11)
// ============================================================================
// Returns consolidated team bonus information for the logged-in user:
// - Team active capital and member count
// - Salary status, qualification, estimated amount
// - Gold status, qualification, estimated amount
// - Daymond status, qualification, current package
// - Progress bars toward each threshold
// - Payment history (recent)
// ============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { d } from '@/lib/auth';
import {
  getTeamBonusConfig,
  calculateTeamActiveCapital,
  hasActiveInvestment,
  getTeamStats,
  getDirectsSalaryInfo,
  getLastSunday,
  getFirstOfMonth,
} from '@/lib/team-bonus';
import { requireAuth, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    if (!userId) throw new BusinessError('Não autorizado', 401);

    const config = await getTeamBonusConfig();
    const weekDate = getLastSunday();
    const monthDate = getFirstOfMonth();

    // Get team stats
    const teamStats = await getTeamStats(userId, config.maxDepth);

    // Check own investment
    const hasOwnInvestment = await hasActiveInvestment(userId);

    // ── AC-09: Salary ───────────────────────────────────────
    let lastSalary: any = null;
    let salaryHistory: any[] = [];
    try {
      lastSalary = await db.weeklySalary.findFirst({
        where: { userId, status: 'paid' },
        orderBy: { createdAt: 'desc' },
      });
      salaryHistory = await db.weeklySalary.findMany({
        where: { userId },
        orderBy: { weekDate: 'desc' },
        take: 12,
      });
    } catch (e) {
      console.error('[team-bonus] Salary query error:', e);
    }

    const salaryQualified = teamStats.totalActiveCapital >= config.salaryMinTeamCapital && hasOwnInvestment;
    const estimatedSalary = salaryQualified ? teamStats.totalActiveCapital * (config.salaryPct / 100) : 0;

    // ── AC-10: Gold ─────────────────────────────────────────
    let lastGold: any = null;
    let goldHistory: any[] = [];
    let directsSalaryInfo = { count: 0, totalSalary: 0 };
    try {
      lastGold = await db.actionGoldPayment.findFirst({
        where: { userId, status: 'paid' },
        orderBy: { createdAt: 'desc' },
      });
      goldHistory = await db.actionGoldPayment.findMany({
        where: { userId },
        orderBy: { weekDate: 'desc' },
        take: 12,
        include: {
          fromUser: { select: { name: true } },
        },
      });
      directsSalaryInfo = await getDirectsSalaryInfo(userId, weekDate);
    } catch (e) {
      console.error('[team-bonus] Gold query error:', e);
    }

    const goldQualified = teamStats.totalActiveCapital >= config.goldMinTeamCapital && hasOwnInvestment;
    const estimatedGold = goldQualified ? directsSalaryInfo.totalSalary * (config.goldPct / 100) : 0;

    // ── AC-11: Daymond ─────────────────────────────────────
    let currentDaymondPkg: any = null;
    let daymondHistory: any[] = [];
    try {
      currentDaymondPkg = await db.daymondPackage.findUnique({
        where: { userId_monthDate: { userId, monthDate } },
        include: { investment: { select: { id: true, status: true, dailyRoi: true, endDate: true } } },
      });
      daymondHistory = await db.daymondPackage.findMany({
        where: { userId },
        orderBy: { monthDate: 'desc' },
        take: 12,
        include: { investment: { select: { id: true, status: true, dailyRoi: true } } },
      });
    } catch (e) {
      console.error('[team-bonus] Daymond query error:', e);
    }

    const daymondQualified = teamStats.totalActiveCapital >= config.daymondMinTeamCapital && hasOwnInvestment;

    // ── Daymond Premium ──────────────────────────────────────
    const daymondPremiumQualified = teamStats.totalActiveCapital >= config.daymondPremiumMinTeamCapital && hasOwnInvestment;
    const estimatedDaymondPremiumDailyRoi = daymondPremiumQualified
      ? Math.min(config.daymondPremiumPackageAmount * (config.daymondPremiumDailyRoiPct / 100), config.daymondPremiumDailyCapUsd)
      : 0;

    // ── Progress ────────────────────────────────────────────
    const salaryProgress = config.salaryMinTeamCapital > 0
      ? Math.min(100, (teamStats.totalActiveCapital / config.salaryMinTeamCapital) * 100)
      : 0;
    const goldProgress = config.goldMinTeamCapital > 0
      ? Math.min(100, (teamStats.totalActiveCapital / config.goldMinTeamCapital) * 100)
      : 0;
    const daymondProgress = config.daymondMinTeamCapital > 0
      ? Math.min(100, (teamStats.totalActiveCapital / config.daymondMinTeamCapital) * 100)
      : 0;
    const daymondPremiumProgress = config.daymondPremiumMinTeamCapital > 0
      ? Math.min(100, (teamStats.totalActiveCapital / config.daymondPremiumMinTeamCapital) * 100)
      : 0;

    // ── Next Sunday countdown ───────────────────────────────
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(nextSunday.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(0, 0, 0, 0);

    return apiSuccess({
      teamActiveCapital: teamStats.totalActiveCapital,
      teamMembers: teamStats.totalMembers,
      teamLevels: teamStats.levels,
      maxDepth: config.maxDepth,
      hasOwnInvestment,

      salary: {
        enabled: config.salaryEnabled,
        qualified: salaryQualified,
        minTeamCapital: config.salaryMinTeamCapital,
        salaryPct: config.salaryPct,
        estimatedWeeklySalary: estimatedSalary,
        nextPaymentDate: nextSunday.toISOString(),
        lastSalary: lastSalary ? {
          amount: d(lastSalary.salaryAmount),
          weekDate: lastSalary.weekDate,
          teamCapital: d(lastSalary.teamActiveCapital),
        } : null,
        history: salaryHistory.map((s: any) => ({
          weekDate: s.weekDate,
          teamCapital: d(s.teamActiveCapital),
          salaryPct: d(s.salaryPct),
          amount: d(s.salaryAmount),
          status: s.status,
        })),
      },

      gold: {
        enabled: config.goldEnabled,
        qualified: goldQualified,
        minTeamCapital: config.goldMinTeamCapital,
        goldPct: config.goldPct,
        estimatedWeeklyGold: estimatedGold,
        directsCount: directsSalaryInfo.count,
        lastGold: lastGold ? {
          amount: d(lastGold.goldAmount),
          weekDate: lastGold.weekDate,
        } : null,
        history: goldHistory.map((g: any) => ({
          weekDate: g.weekDate,
          fromUserName: g.fromUser?.name || '***',
          fromSalaryAmount: d(g.fromSalaryAmount),
          goldPct: d(g.goldPct),
          amount: d(g.goldAmount),
          status: g.status,
        })),
      },

      daymond: {
        enabled: config.daymondEnabled,
        qualified: daymondQualified,
        minTeamCapital: config.daymondMinTeamCapital,
        packageAmount: config.daymondPackageAmount,
        durationDays: config.daymondDurationDays,
        currentPackage: currentDaymondPkg ? {
          status: currentDaymondPkg.status,
          teamCapital: d(currentDaymondPkg.teamActiveCapital),
          investment: currentDaymondPkg.investment ? {
            id: currentDaymondPkg.investment.id,
            status: currentDaymondPkg.investment.status,
            dailyRoi: d(currentDaymondPkg.investment.dailyRoi),
            endDate: currentDaymondPkg.investment.endDate,
          } : null,
        } : null,
        history: daymondHistory.map((dp: any) => ({
          monthDate: dp.monthDate,
          teamCapital: d(dp.teamActiveCapital),
          status: dp.status,
          packageAmount: d(dp.packageAmount),
        })),
      },

      daymondPremium: {
        enabled: config.daymondPremiumEnabled,
        qualified: daymondPremiumQualified,
        minTeamCapital: config.daymondPremiumMinTeamCapital,
        packageAmount: config.daymondPremiumPackageAmount,
        dailyRoiPct: config.daymondPremiumDailyRoiPct,
        dailyCapUsd: config.daymondPremiumDailyCapUsd,
        estimatedDailyRoi: estimatedDaymondPremiumDailyRoi,
      },

      progress: {
        salaryProgress: Math.round(salaryProgress),
        goldProgress: Math.round(goldProgress),
        daymondProgress: Math.round(daymondProgress),
        daymondPremiumProgress: Math.round(daymondPremiumProgress),
      },
    });
  } catch (error) {
    console.error('[team-bonus] Unhandled error:', error);
    return handleApiError(error);
  }
}
