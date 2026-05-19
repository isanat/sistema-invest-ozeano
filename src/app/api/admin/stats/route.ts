import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d as parseNum } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    // Total users
    const totalUsers = await db.user.count({ where: { role: 'user' } });
    const activeUsers = await db.user.count({ where: { role: 'user', isActive: true } });
    const newUsersToday = await db.user.count({
      where: {
        role: 'user',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    // Deposits - using Deposit model
    const allDeposits = await db.deposit.findMany({
      where: { type: 'deposit' },
      select: { amount: true, status: true },
    });
    const depositTotal = allDeposits.reduce((sum, item) => sum + parseNum(item.amount), 0);
    const depositConfirmed = allDeposits.filter(d => d.status === 'confirmed').reduce((sum, d) => sum + parseNum(d.amount), 0);
    const depositPending = allDeposits.filter(d => d.status === 'pending');
    const depositPendingAmount = depositPending.reduce((sum, d) => sum + parseNum(d.amount), 0);

    // Withdrawals
    const allWithdrawals = await db.deposit.findMany({
      where: { type: 'withdrawal' },
      select: { amount: true, status: true },
    });
    const withdrawalTotal = allWithdrawals.reduce((sum, item) => sum + parseNum(item.amount), 0);
    const withdrawalConfirmed = allWithdrawals.filter(d => d.status === 'confirmed').reduce((sum, d) => sum + parseNum(d.amount), 0);
    const withdrawalPending = allWithdrawals.filter(d => d.status === 'pending');
    const withdrawalPendingAmount = withdrawalPending.reduce((sum, d) => sum + parseNum(d.amount), 0);

    // Active investments
    const activeInvestments = await db.investment.count({ where: { status: 'active' } });
    const totalInvestments = await db.investment.count();

    // Total ROI/invested - sum String fields manually
    const users = await db.user.findMany({
      where: { role: 'user' },
      select: { totalRoi: true, totalInvested: true },
    });
    const totalRoi = users.reduce((sum, u) => sum + parseNum(u.totalRoi), 0);
    const totalInvested = users.reduce((sum, u) => sum + parseNum(u.totalInvested), 0);

    // Affiliate commissions
    const allCommissions = await db.affiliateCommission.findMany({
      select: { commissionAmount: true, status: true },
    });
    const totalCommissionAmount = allCommissions.reduce((sum, c) => sum + parseNum(c.commissionAmount), 0);

    // Investment revenue
    const activeInvestmentRecords = await db.investment.findMany({
      where: { status: 'active' },
      select: { amount: true },
    });
    const investmentRevenue = activeInvestmentRecords.reduce((sum, i) => sum + parseNum(i.amount), 0);

    // Copy trading stats
    const activeCopyTraders = await db.copyTrader.count({ where: { isActive: true } });
    const activeTradingPools = await db.tradingPool.count({ where: { status: 'active' } });

    // Recent activity
    const recentDeposits = await db.deposit.findMany({
      where: { type: 'deposit' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const recentWithdrawals = await db.deposit.findMany({
      where: { type: 'withdrawal' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const recentInvestments = await db.investment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
    });

    const recentUsers = await db.user.findMany({
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
    });

    return apiSuccess({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
        },
        deposits: {
          total: allDeposits.length,
          totalAmount: depositTotal,
          confirmedAmount: depositConfirmed,
          pendingCount: depositPending.length,
          pendingAmount: depositPendingAmount,
        },
        withdrawals: {
          total: allWithdrawals.length,
          totalAmount: withdrawalTotal,
          confirmedAmount: withdrawalConfirmed,
          pendingCount: withdrawalPending.length,
          pendingAmount: withdrawalPendingAmount,
        },
        investments: {
          active: activeInvestments,
          total: totalInvestments,
          revenue: investmentRevenue,
        },
        trading: {
          totalRoi,
          totalInvested,
          activeCopyTraders,
          activeTradingPools,
        },
        affiliates: {
          totalCommissions: allCommissions.length,
          totalAmount: totalCommissionAmount,
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
