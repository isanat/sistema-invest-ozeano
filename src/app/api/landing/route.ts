import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

// Public landing page data - no auth required
export async function GET() {
  try {
    // Get all active investment plans with stats and copy traders
    const [plans, traders, affiliateLevels, configs] = await Promise.all([
      db.investmentPlan.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { investments: { where: { status: 'active' } } },
          },
        },
      }),
      db.copyTrader.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      }),
      db.affiliateLevel.findMany({
        where: { isActive: true },
        orderBy: { level: 'asc' },
      }),
      db.systemConfig.findMany({
        where: {
          key: {
            in: [
              'site_name',
              'site_logo',
              'site_favicon',
              'min_deposit_usdt',
              'min_investment_usdt',
              'min_withdrawal_usdt',
              'withdrawal_fee_pct',
              'has_pix',
              'has_usdt',
              'usdt_brl_rate',
              'maintenance_mode',
              'daily_roi_pct',
              'transfer_enabled',
              // Team Bonus - Salary
              'team_bonus_salary_enabled',
              'team_bonus_salary_pct',
              'team_bonus_salary_min_team_capital',
              // Team Bonus - Gold
              'team_bonus_gold_enabled',
              'team_bonus_gold_pct',
              'team_bonus_gold_min_team_capital',
              // Team Bonus - Daymond
              'team_bonus_daymond_enabled',
              'team_bonus_daymond_package_amount',
              'team_bonus_daymond_min_team_capital',
              // Team Bonus - Daymond Premium
              'team_bonus_daymond_premium_enabled',
              'team_bonus_daymond_premium_package_amount',
              'team_bonus_daymond_premium_min_team_capital',
              'team_bonus_daymond_premium_daily_cap_usd',
            ],
          },
        },
      }),
    ]);

    // Dynamic stats from real data
    const [
      totalUsers,
      activeInvestments,
      users,
    ] = await Promise.all([
      db.user.count({ where: { role: 'user', isActive: true } }),
      db.investment.count({ where: { status: 'active' } }),
      db.user.findMany({
        where: { role: 'user' },
        select: { totalRoi: true, totalInvested: true },
      }),
    ]);

    // Sum string fields manually
    let totalRoi = 0;
    let totalInvested = 0;
    for (const u of users) {
      totalRoi += d(u.totalRoi);
      totalInvested += d(u.totalInvested);
    }

    const usdtBrlRate = await getUSDTBRLRate();

    const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));

    return apiSuccess({
      traders,
      plans,
      affiliateLevels,
      config: {
        siteName: configMap.site_name || 'ActionCash',
        siteLogo: configMap.site_logo || '',
        siteFavicon: configMap.site_favicon || '',
        minDeposit: configMap.min_deposit_usdt || '5',
        minInvestment: configMap.min_investment_usdt || '5',
        minWithdrawal: configMap.min_withdrawal_usdt || '5',
        withdrawalFeePct: configMap.withdrawal_fee_pct || '5',
        hasPix: configMap.has_pix === 'true',
        hasUsdt: configMap.has_usdt === 'true',
        usdtBrlRate: Number(configMap.usdt_brl_rate) || usdtBrlRate,
        maintenanceMode: configMap.maintenance_mode === 'true',
        dailyRoiPct: configMap.daily_roi_pct || '3.3',
        transferEnabled: configMap.transfer_enabled === 'true',
        // Team Bonus - Salary
        teamBonusSalaryEnabled: configMap.team_bonus_salary_enabled === 'true',
        teamBonusSalaryPct: configMap.team_bonus_salary_pct || '0.5',
        teamBonusSalaryMinTeamCapital: configMap.team_bonus_salary_min_team_capital || '2000',
        // Team Bonus - Gold
        teamBonusGoldEnabled: configMap.team_bonus_gold_enabled === 'true',
        teamBonusGoldPct: configMap.team_bonus_gold_pct || '50',
        teamBonusGoldMinTeamCapital: configMap.team_bonus_gold_min_team_capital || '4000',
        // Team Bonus - Daymond
        teamBonusDaymondEnabled: configMap.team_bonus_daymond_enabled === 'true',
        teamBonusDaymondPackageAmount: configMap.team_bonus_daymond_package_amount || '1000',
        teamBonusDaymondMinTeamCapital: configMap.team_bonus_daymond_min_team_capital || '20000',
        // Team Bonus - Daymond Premium
        teamBonusDaymondPremiumEnabled: configMap.team_bonus_daymond_premium_enabled === 'true',
        teamBonusDaymondPremiumPackageAmount: configMap.team_bonus_daymond_premium_package_amount || '2000',
        teamBonusDaymondPremiumMinTeamCapital: configMap.team_bonus_daymond_premium_min_team_capital || '50000',
        teamBonusDaymondPremiumDailyCapUsd: configMap.team_bonus_daymond_premium_daily_cap_usd || '99',
      },
      stats: {
        totalUsers,
        activeInvestments,
        totalRoi,
        totalInvested,
      },
      usdtBrlRate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
