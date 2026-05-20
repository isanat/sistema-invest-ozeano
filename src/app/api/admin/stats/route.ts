import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d as parseNum } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Run independent count queries in parallel
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      activeInvestments,
      totalInvestments,
      activeCopyTraders,
      activeTradingPools,
    ] = await Promise.all([
      db.user.count({ where: { role: 'user' } }),
      db.user.count({ where: { role: 'user', isActive: true } }),
      db.user.count({
        where: {
          role: 'user',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.investment.count({ where: { status: 'active' } }),
      db.investment.count(),
      db.copyTrader.count({ where: { isActive: true } }),
      db.tradingPool.count({ where: { status: 'active' } }),
    ]);

    // Deposit aggregation via SQL (amount is String field, Prisma _sum doesn't work on Strings)
    const [depositStats, withdrawalStats, userFinancialStats, commissionStats, investmentRevenueStats] = await Promise.all([
      db.$queryRaw<Array<{
        total_count: bigint;
        total_amount: number;
        confirmed_amount: number;
        pending_count: bigint;
        pending_amount: number;
      }>>`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) as confirmed_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) as pending_amount
        FROM "Deposit" WHERE type = 'deposit'
      `,
      db.$queryRaw<Array<{
        total_count: bigint;
        total_amount: number;
        confirmed_amount: number;
        pending_count: bigint;
        pending_amount: number;
      }>>`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) as confirmed_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) as pending_amount
        FROM "Deposit" WHERE type = 'withdrawal'
      `,
      db.$queryRaw<Array<{ total_roi: number; total_invested: number }>>`
        SELECT
          COALESCE(SUM(CAST("totalRoi" AS NUMERIC)), 0) as total_roi,
          COALESCE(SUM(CAST("totalInvested" AS NUMERIC)), 0) as total_invested
        FROM "User" WHERE role = 'user'
      `,
      db.$queryRaw<Array<{ total_count: bigint; total_amount: number }>>`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(CAST("commissionAmount" AS NUMERIC)), 0) as total_amount
        FROM "AffiliateCommission"
      `,
      db.$queryRaw<Array<{ revenue: number }>>`
        SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as revenue
        FROM "Investment" WHERE status = 'active'
      `,
    ]);

    const ds = depositStats[0];
    const ws = withdrawalStats[0];
    const ufs = userFinancialStats[0];
    const cs = commissionStats[0];
    const irs = investmentRevenueStats[0];

    // Recent activity - parallel since independent
    const [recentDeposits, recentWithdrawals, recentInvestments, recentUsers] = await Promise.all([
      db.deposit.findMany({
        where: { type: 'deposit' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      db.deposit.findMany({
        where: { type: 'withdrawal' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      db.investment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          plan: { select: { name: true } },
        },
      }),
      db.user.findMany({
        where: { role: 'user' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          balance: true,
          createdAt: true,
        },
      }),
    ]);

    return apiSuccess({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
        },
        deposits: {
          total: Number(ds.total_count),
          totalAmount: ds.total_amount,
          confirmedAmount: ds.confirmed_amount,
          pendingCount: Number(ds.pending_count),
          pendingAmount: ds.pending_amount,
        },
        withdrawals: {
          total: Number(ws.total_count),
          totalAmount: ws.total_amount,
          confirmedAmount: ws.confirmed_amount,
          pendingCount: Number(ws.pending_count),
          pendingAmount: ws.pending_amount,
        },
        investments: {
          active: activeInvestments,
          total: totalInvestments,
          revenue: irs.revenue,
        },
        trading: {
          totalRoi: ufs.total_roi,
          totalInvested: ufs.total_invested,
          activeCopyTraders,
          activeTradingPools,
        },
        affiliates: {
          totalCommissions: Number(cs.total_count),
          totalAmount: cs.total_amount,
        },
      },
      recentActivity: {
        deposits: recentDeposits,
        withdrawals: recentWithdrawals,
        investments: recentInvestments,
        users: recentUsers,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
