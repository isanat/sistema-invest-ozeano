import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

// Public landing page data - no auth required
export async function GET() {
  try {
    // Get all active miners with active plans
    const [miners, affiliateLevels, configs] = await Promise.all([
      db.miner.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          plans: {
            where: { isActive: true },
            orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { days: 'asc' }],
          },
          _count: {
            select: { rentals: true },
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
    // Note: Can't use aggregate/_sum on String fields in SQLite, so we fetch and sum manually
    const [
      totalUsers,
      activeRentals,
      users,
    ] = await Promise.all([
      db.user.count({ where: { role: 'user', isActive: true } }),
      db.miningRental.count({ where: { status: 'active' } }),
      db.user.findMany({
        where: { role: 'user' },
        select: { totalMined: true, totalInvested: true },
      }),
    ]);

    // Sum string fields manually
    let totalMined = 0;
    let totalInvested = 0;
    for (const u of users) {
      totalMined += d(u.totalMined);
      totalInvested += d(u.totalInvested);
    }

    const usdtBrlRate = await getUSDTBRLRate();

    const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));

    return apiSuccess({
      miners,
      affiliateLevels,
      config: {
        siteName: configMap.site_name || 'Mining Protocol',
        minDeposit: configMap.min_deposit_usdt || '10',
        minWithdrawal: configMap.min_withdrawal_usdt || '10',
        hasPix: !!configMap.pix_key,
        hasUsdt: !!configMap.usdt_trc20_address,
      },
      stats: {
        totalUsers,
        activeRentals,
        totalMined,
        totalInvested,
      },
      usdtBrlRate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
