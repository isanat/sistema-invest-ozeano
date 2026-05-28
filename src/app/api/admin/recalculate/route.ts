import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// POST /api/admin/recalculate — Recalculate all user balances and investment accumulatedRoi from RoiHistory
// This is a maintenance endpoint to fix any discrepancies between RoiHistory and User totals.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    console.info('[RECALC] Starting full balance recalculation...');

    // Step 1: Recalculate Investment.accumulatedRoi from RoiHistory
    const investmentRoi = await db.roiHistory.groupBy({
      by: ['investmentId'],
      _sum: { totalRoi: true },
    });

    let investmentsUpdated = 0;
    for (const item of investmentRoi) {
      if (!item.investmentId) continue;
      const totalEarned = d(item._sum.totalRoi);
      if (totalEarned > 0) {
        await db.investment.update({
          where: { id: item.investmentId },
          data: { accumulatedRoi: ds(totalEarned) },
        });
        investmentsUpdated++;
      }
    }

    // Step 2: Recalculate User.totalRoi from RoiHistory
    const userRoi = await db.roiHistory.groupBy({
      by: ['userId'],
      _sum: { totalRoi: true },
    });

    let usersUpdated = 0;
    for (const item of userRoi) {
      if (!item.userId) continue;
      const totalEarned = d(item._sum.totalRoi);
      // Update User.totalRoi
      await db.user.update({
        where: { id: item.userId },
        data: { totalRoi: ds(totalEarned) },
      });
      usersUpdated++;
    }

    // Step 3: Recalculate User.balance from transactions
    // balance = sum of deposits - sum of withdrawals - sum of investments + sum of roi_profit + sum of admin_adjusts
    const users = await db.user.findMany({
      select: { id: true, balance: true, totalRoi: true },
    });

    let balancesCorrected = 0;
    for (const user of users) {
      const txSummary = await db.transaction.groupBy({
        by: ['userId'],
        where: {
          userId: user.id,
          status: 'completed',
        },
        _sum: { amount: true },
      });

      // Get individual transaction type sums
      const deposits = await db.transaction.aggregate({
        where: { userId: user.id, type: 'deposit', status: 'completed' },
        _sum: { amount: true },
      });
      const withdrawals = await db.transaction.aggregate({
        where: { userId: user.id, type: 'withdrawal', status: 'completed' },
        _sum: { amount: true },
      });
      const investments = await db.transaction.aggregate({
        where: { userId: user.id, type: 'investment', status: 'completed' },
        _sum: { amount: true },
      });
      const roiProfit = await db.transaction.aggregate({
        where: { userId: user.id, type: 'roi_profit', status: 'completed' },
        _sum: { amount: true },
      });
      const adminAdjusts = await db.transaction.aggregate({
        where: { userId: user.id, type: 'admin_adjust', status: 'completed' },
        _sum: { amount: true },
      });
      const affiliateComm = await db.transaction.aggregate({
        where: { userId: user.id, type: 'affiliate_commission', status: 'completed' },
        _sum: { amount: true },
      });

      const totalDeposits = d(deposits._sum.amount);
      const totalWithdrawals = d(withdrawals._sum.amount);
      const totalInvestments = d(investments._sum.amount);
      const totalRoiProfit = d(roiProfit._sum.amount);
      const totalAdminAdjusts = d(adminAdjusts._sum.amount);
      const totalAffiliateComm = d(affiliateComm._sum.amount);

      // Balance = deposits + roi_profit + admin_adjusts + affiliate_commissions - withdrawals - investments
      const correctBalance = totalDeposits + totalRoiProfit + totalAdminAdjusts + totalAffiliateComm - totalWithdrawals - totalInvestments;

      const currentBalance = d(user.balance);
      if (Math.abs(correctBalance - currentBalance) > 0.01) {
        await db.user.update({
          where: { id: user.id },
          data: { balance: ds(Math.max(0, correctBalance)) },
        });
        balancesCorrected++;
        console.info(`[RECALC] User ${user.id}: balance corrected from ${currentBalance} to ${correctBalance}`);
      }
    }

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'recalculate',
        entity: 'system',
        description: `Recalculation complete: ${investmentsUpdated} investments, ${usersUpdated} users ROI updated, ${balancesCorrected} balances corrected`,
      },
    });

    return apiSuccess({
      message: 'Recálculo concluído',
      investmentsUpdated,
      usersUpdated,
      balancesCorrected,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
