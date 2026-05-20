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
              'min_withdrawal_usdt',
              'has_pix',
              'has_usdt',
              'usdt_brl_rate',
              'maintenance_mode',
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
        siteName: configMap.site_name || 'PLATAFORMA ROI',
        siteLogo: configMap.site_logo || '',
        siteFavicon: configMap.site_favicon || '',
        minDeposit: configMap.min_deposit_usdt || '10',
        minWithdrawal: configMap.min_withdrawal_usdt || '10',
        hasPix: configMap.has_pix === 'true',
        hasUsdt: configMap.has_usdt === 'true',
        usdtBrlRate: Number(configMap.usdt_brl_rate) || usdtBrlRate,
        maintenanceMode: configMap.maintenance_mode === 'true',
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
