import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// POST /api/admin/recalculate — Recalculate all user balances and investment accumulatedRoi from RoiHistory
// This is a maintenance endpoint to fix any discrepancies between RoiHistory and User totals.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    console.info('[RECALC] Starting full balance recalculation...');

    let investmentsUpdated = 0;
    let usersUpdated = 0;
    let balancesCorrected = 0;

    if (isPostgres()) {
      // Step 1: Update Investment.accumulatedRoi from RoiHistory (PostgreSQL)
      const invResult = await db.$executeRaw`
        UPDATE "Investment" i
        SET "accumulatedRoi" = sub.total
        FROM (
          SELECT "investmentId", SUM(CAST("totalRoi" AS NUMERIC)) as total
          FROM "RoiHistory"
          GROUP BY "investmentId"
        ) sub
        WHERE i.id = sub."investmentId" AND i."accumulatedRoi" != sub.total::text
      `;
      investmentsUpdated = invResult;

      // Step 2: Update User.totalRoi from RoiHistory (PostgreSQL)
      const userRoiResult = await db.$executeRaw`
        UPDATE "User" u
        SET "totalRoi" = sub.total
        FROM (
          SELECT "userId", SUM(CAST("totalRoi" AS NUMERIC)) as total
          FROM "RoiHistory"
          GROUP BY "userId"
        ) sub
        WHERE u.id = sub."userId" AND u."totalRoi" != sub.total::text
      `;
      usersUpdated = userRoiResult;

      // Step 3: Recalculate User.balance from transactions (PostgreSQL)
      const balResult = await db.$executeRaw`
        UPDATE "User" u
        SET balance = GREATEST(0, sub.correct_balance)::text
        FROM (
          SELECT 
            t."userId",
            SUM(CASE WHEN t.type IN ('deposit', 'roi_profit', 'admin_adjust', 'affiliate_commission') THEN CAST(t.amount AS NUMERIC) ELSE 0 END) -
            SUM(CASE WHEN t.type IN ('withdrawal', 'investment') THEN CAST(t.amount AS NUMERIC) ELSE 0 END) as correct_balance
          FROM "Transaction" t
          WHERE t.status = 'completed'
          GROUP BY t."userId"
        ) sub
        WHERE u.id = sub."userId" AND ABS(CAST(u.balance AS NUMERIC) - sub.correct_balance) > 0.01
      `;
      balancesCorrected = balResult;
    } else {
      // SQLite fallback (for development)
      // Step 1: Get all RoiHistory grouped by investmentId
      const roiRecords = await db.roiHistory.findMany();
      const invMap = new Map<string, number>();
      const userMap = new Map<string, number>();
      for (const r of roiRecords) {
        const invId = r.investmentId;
        const userId = r.userId;
        const amount = d(r.totalRoi);
        invMap.set(invId, (invMap.get(invId) || 0) + amount);
        userMap.set(userId, (userMap.get(userId) || 0) + amount);
      }

      for (const [invId, total] of invMap) {
        await db.investment.update({
          where: { id: invId },
          data: { accumulatedRoi: ds(total) },
        });
        investmentsUpdated++;
      }

      for (const [userId, total] of userMap) {
        await db.user.update({
          where: { id: userId },
          data: { totalRoi: ds(total) },
        });
        usersUpdated++;
      }
    }

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'recalculate',
        entity: 'system',
        description: `Recalculation complete: ${investmentsUpdated} investments, ${usersUpdated} users ROI updated, ${balancesCorrected} balances corrected`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      message: 'Recálculo concluído',
      investmentsUpdated,
      usersUpdated,
      balancesCorrected,
    });
  } catch (error) {
    console.error('[RECALC] Error:', error);
    return handleApiError(error);
  }
}
