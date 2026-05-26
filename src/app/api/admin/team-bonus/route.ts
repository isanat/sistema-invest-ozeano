// ============================================================================
// ADMIN: Team Bonus Management (GET stats, PUT config, POST triggers)
// ============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { d } from '@/lib/auth';
import { getTeamBonusConfig, type TeamBonusConfig } from '@/lib/team-bonus';
import { requireAdmin, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';

// ─── GET: Dashboard stats + config + recent payments ──────────────────
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) throw new BusinessError('Não autorizado', 401);

    const config = await getTeamBonusConfig();

    // Stats: last week totals
    const oneWeekAgo = new Date();
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);

    const [lastWeekSalaries, lastWeekGold, activeDaymondPkgs, allDaymondPkgs] = await Promise.all([
      db.weeklySalary.findMany({
        where: { createdAt: { gte: oneWeekAgo }, status: 'paid' },
        select: { salaryAmount: true },
      }),
      db.actionGoldPayment.findMany({
        where: { createdAt: { gte: oneWeekAgo }, status: 'paid' },
        select: { goldAmount: true },
      }),
      db.daymondPackage.findMany({
        where: { status: 'active' },
        select: { packageAmount: true },
      }),
      db.daymondPackage.findMany({
        where: { status: { in: ['active', 'qualified'] } },
        select: { id: true },
      }),
    ]);

    const totalWeeklyPaid = lastWeekSalaries.reduce((sum, s) => sum + d(s.salaryAmount), 0);
    const totalGoldPaid = lastWeekGold.reduce((sum, g) => sum + d(g.goldAmount), 0);
    const totalDaymondAmount = activeDaymondPkgs.reduce((sum, p) => sum + d(p.packageAmount), 0);

    // Count qualified users (estimate based on current state)
    const usersWithInvestments = await db.user.count({
      where: { isActive: true, investments: { some: { status: 'active' } } },
    });

    // Recent payments for display
    const [recentSalaries, recentGold, recentDaymond] = await Promise.all([
      db.weeklySalary.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      }),
      db.actionGoldPayment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true, email: true } },
          fromUser: { select: { name: true } },
        },
      }),
      db.daymondPackage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    return apiSuccess({
      config,
      stats: {
        totalWeeklyPaid,
        totalGoldPaid,
        totalDaymondActive: activeDaymondPkgs.length,
        totalDaymondAmount,
        usersWithInvestments,
      },
      recentSalaries: recentSalaries.map(s => ({
        id: s.id,
        userName: s.user.name,
        userEmail: s.user.email,
        weekDate: s.weekDate,
        teamCapital: d(s.teamActiveCapital),
        salaryPct: d(s.salaryPct),
        amount: d(s.salaryAmount),
        status: s.status,
        createdAt: s.createdAt,
      })),
      recentGold: recentGold.map(g => ({
        id: g.id,
        userName: g.user.name,
        userEmail: g.user.email,
        fromUserName: g.fromUser.name,
        weekDate: g.weekDate,
        fromSalaryAmount: d(g.fromSalaryAmount),
        goldPct: d(g.goldPct),
        amount: d(g.goldAmount),
        status: g.status,
        createdAt: g.createdAt,
      })),
      recentDaymond: recentDaymond.map(dp => ({
        id: dp.id,
        userName: dp.user.name,
        userEmail: dp.user.email,
        monthDate: dp.monthDate,
        teamCapital: d(dp.teamActiveCapital),
        packageAmount: d(dp.packageAmount),
        status: dp.status,
        createdAt: dp.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── PUT: Update team bonus configuration ─────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) throw new BusinessError('Não autorizado', 401);

    const body = await request.json();

    const configKeys: Record<string, { value: string; type: string }> = {
      team_bonus_salary_enabled: { value: String(body.salaryEnabled ?? false), type: 'boolean' },
      team_bonus_salary_pct: { value: String(body.salaryPct ?? 0.5), type: 'number' },
      team_bonus_salary_min_team_capital: { value: String(body.salaryMinTeamCapital ?? 2000), type: 'number' },
      team_bonus_salary_requires_own_investment: { value: String(body.salaryRequiresOwnInvestment ?? true), type: 'boolean' },
      team_bonus_gold_enabled: { value: String(body.goldEnabled ?? false), type: 'boolean' },
      team_bonus_gold_pct: { value: String(body.goldPct ?? 50), type: 'number' },
      team_bonus_gold_min_team_capital: { value: String(body.goldMinTeamCapital ?? 4000), type: 'number' },
      team_bonus_daymond_enabled: { value: String(body.daymondEnabled ?? false), type: 'boolean' },
      team_bonus_daymond_package_amount: { value: String(body.daymondPackageAmount ?? 1000), type: 'number' },
      team_bonus_daymond_min_team_capital: { value: String(body.daymondMinTeamCapital ?? 20000), type: 'number' },
      team_bonus_daymond_duration_days: { value: String(body.daymondDurationDays ?? 30), type: 'number' },
      team_bonus_daymond_generates_commissions: { value: String(body.daymondGeneratesCommissions ?? false), type: 'boolean' },
      team_bonus_daily_cap_usd: { value: String(body.dailyCapUsd ?? 0), type: 'number' },
      team_bonus_max_depth: { value: String(body.maxDepth ?? 6), type: 'number' },
    };

    // Update each config key
    for (const [key, data] of Object.entries(configKeys)) {
      await db.systemConfig.upsert({
        where: { key },
        update: { value: data.value },
        create: {
          key,
          value: data.value,
          type: data.type,
          category: 'team_bonus',
          isActive: true,
        },
      });
    }

    // Admin log
    await db.adminLog.create({
      data: {
        adminId,
        action: 'update',
        entity: 'team_bonus_config',
        description: 'Configurações de bônus de equipe atualizadas',
        newValue: JSON.stringify(body),
      },
    });

    return apiSuccess({ message: 'Configurações de bônus de equipe salvas com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── POST: Manual trigger of cron jobs ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) throw new BusinessError('Não autorizado', 401);

    const body = await request.json();
    const { action } = body;

    if (!action || !['weekly', 'daymond'].includes(action)) {
      throw new BusinessError('Ação inválida. Use "weekly" ou "daymond".');
    }

    // Trigger by calling the cron endpoint internally
    const cronSecret = process.env.CRON_SECRET || '';
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const endpoint = action === 'weekly'
      ? '/api/cron/weekly-bonuses'
      : '/api/cron/monthly-daymond';

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();

      await db.adminLog.create({
        data: {
          adminId,
          action: 'trigger',
          entity: action === 'weekly' ? 'weekly_bonuses' : 'monthly_daymond',
          description: `Trigger manual: ${action}`,
          newValue: JSON.stringify(result),
        },
      });

      return apiSuccess(result);
    } catch (fetchErr) {
      console.error('[ADMIN TEAM BONUS] Trigger error:', fetchErr);
      throw new BusinessError('Erro ao executar trigger. Verifique os logs do servidor.');
    }
  } catch (error) {
    return handleApiError(error);
  }
}
