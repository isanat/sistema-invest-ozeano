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

    // Deposits - fetch and sum manually since financial values are stored as Strings
    const allDeposits = await db.investment.findMany({
      where: { type: 'deposit' },
      select: { amount: true, status: true },
    });
    const depositTotal = allDeposits.reduce((sum, item) => sum + parseNum(item.amount), 0);
    const depositConfirmed = allDeposits.filter(i => i.status === 'confirmed').reduce((sum, i) => sum + parseNum(i.amount), 0);
    const depositPending = allDeposits.filter(i => i.status === 'pending');
    const depositPendingAmount = depositPending.reduce((sum, i) => sum + parseNum(i.amount), 0);

    // Withdrawals
    const allWithdrawals = await db.investment.findMany({
      where: { type: 'withdrawal' },
      select: { amount: true, status: true },
    });
    const withdrawalTotal = allWithdrawals.reduce((sum, item) => sum + parseNum(item.amount), 0);
    const withdrawalConfirmed = allWithdrawals.filter(i => i.status === 'confirmed').reduce((sum, i) => sum + parseNum(i.amount), 0);
    const withdrawalPending = allWithdrawals.filter(i => i.status === 'pending');
    const withdrawalPendingAmount = withdrawalPending.reduce((sum, i) => sum + parseNum(i.amount), 0);

    // Active rentals
    const activeRentals = await db.miningRental.count({ where: { status: 'active' } });
    const totalRentals = await db.miningRental.count();

    // Total mined/invested - sum String fields manually
    const users = await db.user.findMany({
      where: { role: 'user' },
      select: { totalMined: true, totalInvested: true },
    });
    const totalMined = users.reduce((sum, u) => sum + parseNum(u.totalMined), 0);
    const totalInvested = users.reduce((sum, u) => sum + parseNum(u.totalInvested), 0);

    // Affiliate commissions
    const allCommissions = await db.affiliateCommission.findMany({
      select: { commissionAmount: true, status: true },
    });
    const totalCommissionAmount = allCommissions.reduce((sum, c) => sum + parseNum(c.commissionAmount), 0);

    // Rental revenue
    const activeRentalRecords = await db.miningRental.findMany({
      where: { status: 'active' },
      select: { amount: true },
    });
    const rentalRevenue = activeRentalRecords.reduce((sum, r) => sum + parseNum(r.amount), 0);

    // Recent activity
    const recentDeposits = await db.investment.findMany({
      where: { type: 'deposit' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const recentWithdrawals = await db.investment.findMany({
      where: { type: 'withdrawal' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const recentRentals = await db.miningRental.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        miner: { select: { name: true, coin: true } },
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
        rentals: {
          active: activeRentals,
          total: totalRentals,
          revenue: rentalRevenue,
        },
        mining: {
          totalMined,
          totalInvested,
        },
        affiliates: {
          totalCommissions: allCommissions.length,
          totalAmount: totalCommissionAmount,
        },
      },
      recentActivity: {
        deposits: recentDeposits,
        withdrawals: recentWithdrawals,
        rentals: recentRentals,
        users: recentUsers,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
