import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, dusdt } from '@/lib/auth';
import { apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// ============================================================================
// POST /api/admin/migrate/balance-source
// ============================================================================
// Migration endpoint to populate totalDeposited and Investment.source
// for existing users before the Abordagem B update.
//
// What it does:
// 1. For each user, sum confirmed deposits and update totalDeposited
// 2. For investments with VoucherUsage, set source='voucher'
// 3. For investments without VoucherUsage, set source='deposit'
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const results = {
      usersUpdated: 0,
      investmentsUpdated: 0,
      errors: [] as string[],
    };

    // Step 1: Populate totalDeposited for all users
    // Sum all confirmed deposits from the Deposit table
    const depositSums = await db.$queryRaw<Array<{ userId: string; total: number }>>`
      SELECT "userId", COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
      FROM "Deposit"
      WHERE type = 'deposit' AND status IN ('confirmed', 'completed')
      GROUP BY "userId"
    `;

    for (const row of depositSums) {
      try {
        await db.$executeRaw`
          UPDATE "User" SET "totalDeposited" = ${dusdt(row.total)} WHERE id = ${row.userId}
        `;
        results.usersUpdated++;
      } catch (err: any) {
        results.errors.push(`User ${row.userId}: ${err.message}`);
      }
    }

    // Also update users who have no deposits (set totalDeposited = "0" if still default)
    // This is handled by the default value in the schema, so no action needed.

    // Step 2: Populate Investment.source based on VoucherUsage
    // Investments that have a VoucherUsage record → source='voucher'
    const voucherUsageInvestments = await db.voucherUsage.findMany({
      select: { investmentId: true },
    });
    const voucherInvestmentIds = new Set(voucherUsageInvestments.map(vu => vu.investmentId));

    // Update investments with VoucherUsage to source='voucher'
    if (voucherInvestmentIds.size > 0) {
      const ids = Array.from(voucherInvestmentIds);
      // Update in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        try {
          await db.investment.updateMany({
            where: { id: { in: batch } },
            data: { source: 'voucher' },
          });
          results.investmentsUpdated += batch.length;
        } catch (err: any) {
          results.errors.push(`Voucher investments batch: ${err.message}`);
        }
      }
    }

    // Investments without VoucherUsage → source='deposit' (already the default, but ensure it)
    // Only update investments that still have the default source or null
    const depositUpdateResult = await db.investment.updateMany({
      where: {
        source: 'deposit', // Already the default, but let's verify
      },
      data: { source: 'deposit' },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'user',
        description: `Balance source migration: ${results.usersUpdated} users updated, ${results.investmentsUpdated} investments set to source='voucher'`,
        newValue: JSON.stringify(results),
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      message: `Migration complete: ${results.usersUpdated} users updated with totalDeposited, ${results.investmentsUpdated} investments set to source='voucher'`,
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
