import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

// Public landing page data - no auth required
export async function GET() {
  try {
    // Get all active investment plans with stats
    const [plans, affiliateLevels, configs] = await Promise.all([
      db.investmentPlan.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { investments: { where: { status: 'active' } } },
          },
        },
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
              'min_deposit_usdt',
              'min_withdrawal_usdt',
              'pix_key',
              'usdt_trc20_address',
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
      plans,
      affiliateLevels,
      config: {
        siteName: configMap.site_name || 'Ozeano Invest',
        minDeposit: configMap.min_deposit_usdt || '10',
        minWithdrawal: configMap.min_withdrawal_usdt || '10',
        hasPix: !!configMap.pix_key,
        hasUsdt: !!configMap.usdt_trc20_address,
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
