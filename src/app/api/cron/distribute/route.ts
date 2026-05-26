import { NextRequest } from 'next/server';
import { db, isPostgres, acquireAdvisoryLock, releaseAdvisoryLock } from '@/lib/db';
import { d, ds, dusdt } from '@/lib/auth';
import { processCommissions, getTeamBonusPct } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// ============================================================================
// CRON: Daily ROI Distribution
// ============================================================================
// Called by Vercel Cron (daily at midnight UTC) or manually with Bearer token.
// For each active Investment:
//   1. Calculate daily ROI = investment.amount × (investment.dailyRoiPct / 100)
//   2. Add team bonus = dailyROI × (teamBonusPct / 100)
//   3. Create RoiHistory record
//   4. Credit user's balance and totalRoi
//   5. Create Transaction (type='roi_profit')
//   6. Auto-complete expired investments
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET || '';
const IS_VERCEL = process.env.VERCEL === '1';

function isCronAuthorized(request: NextRequest): boolean {
  // Always check CRON_SECRET first
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET) return true;
  // Vercel Cron sends a specific header for verification
  if (IS_VERCEL) {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === 'true') return true;
  }
  // CRITICAL: Only allow without auth in development mode
  if (process.env.NODE_ENV === 'development' && !CRON_SECRET) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!isCronAuthorized(request)) {
      return apiError('Não autorizado', 401);
    }

    console.info('[CRON] Starting daily ROI distribution...', new Date().toISOString());

    // PostgreSQL: acquire advisory lock to prevent concurrent cron execution
    const lockAcquired = await acquireAdvisoryLock(12345);
    if (!lockAcquired) {
      return apiError('Could not acquire advisory lock - another cron job is running', 423);
    }

    try {
    // Get all active investments
    const activeInvestments = await db.investment.findMany({
      where: { status: 'active' },
      include: {
        plan: true,
      },
    });

    if (activeInvestments.length === 0) {
      // No active investments found
      return apiSuccess({ message: 'Nenhum investimento ativo', processed: 0 });
    }



    let processed = 0;
    let skipped = 0;
    let completed = 0;
    let totalDistributed = 0;
    const errors: string[] = [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const investment of activeInvestments) {
      try {
        // Check if investment has ended - auto-complete expired investments
        if (new Date(investment.endDate) <= today) {
          await db.investment.update({
            where: { id: investment.id },
            data: { status: 'completed' },
          });
          completed++;
          continue;
        }

        // Check if investment hasn't started yet
        if (new Date(investment.startDate) > today) {
          skipped++;
          continue;
        }

        // Check if we already distributed ROI for today
        const existingHistory = await db.roiHistory.findFirst({
          where: {
            investmentId: investment.id,
            date: { gte: today },
          },
        });

        if (existingHistory) {
          skipped++;
          continue;
        }

        // Calculate daily ROI
        const amount = d(investment.amount);
        const dailyRoiPct = d(investment.dailyRoiPct);
        let dailyROI = amount * (dailyRoiPct / 100);

        // Apply daily cap for Daymond Premium investments
        if (investment.source === 'daymond_premium') {
          const capConfig = await db.systemConfig.findUnique({
            where: { key: 'team_bonus_daymond_premium_daily_cap_usd' },
          });
          const dailyCap = capConfig ? d(capConfig.value) : 99;
          if (dailyCap > 0 && dailyROI > dailyCap) {
            dailyROI = dailyCap;
          }
        }

        // Calculate team bonus
        const teamBonusPct = d(investment.teamBonusPct);
        const teamBonus = dailyROI * (teamBonusPct / 100);
        const totalRoiForToday = dailyROI + teamBonus;

        // Skip if zero ROI (edge case)
        if (totalRoiForToday <= 0) {
          skipped++;
          continue;
        }

        // Use transaction for atomicity
        const roiHistoryId = await db.$transaction(async (tx) => {
          // Create ROI history record
          const roiHistory = await tx.roiHistory.create({
            data: {
              userId: investment.userId,
              investmentId: investment.id,
              date: today,
              roiAmount: ds(dailyROI),
              roiPct: ds(dailyRoiPct),
              teamBonus: ds(teamBonus),
              totalRoi: ds(totalRoiForToday),
            },
          });

          // Credit user balance atomically using raw SQL (PostgreSQL)
          await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${totalRoiForToday}) AS TEXT), "totalRoi" = CAST((CAST("totalRoi" AS NUMERIC) + ${totalRoiForToday}) AS TEXT) WHERE id = ${investment.userId}`;

          // Create transaction record
          const planName = investment.plan?.name || 'Plano';
          await tx.transaction.create({
            data: {
              userId: investment.userId,
              type: 'roi_profit',
              amount: ds(totalRoiForToday),
              status: 'completed',
              description: `ROI diário ${planName}${teamBonusPct > 0 ? ` (+${teamBonusPct}% Team Bonus)` : ''}`,
              referenceId: investment.id,
              referenceType: 'Investment',
            },
          });

          return roiHistory.id;
        });

        // Only process affiliate commissions for deposit-funded investments
        // Voucher-funded and Daymond-funded investments don't generate commissions
        if (investment.source !== 'voucher' && investment.source !== 'daymond' && investment.source !== 'daymond_premium') {
          try {
            await processCommissions(investment.userId, totalRoiForToday, 'trading', roiHistoryId);
          } catch (commErr) {
            console.error('[CRON] Commission error for investment', investment.id, commErr);
            errors.push(`Commission error: investment ${investment.id}`);
          }
        }

        totalDistributed += totalRoiForToday;
        processed++;
      } catch (investmentErr: any) {
        console.error('[CRON] Distribution error for investment', investment.id, investmentErr);
        errors.push(`Investment ${investment.id}: ${investmentErr.message}`);
      }
    }

    const summary = `Processed: ${processed}, Skipped: ${skipped}, Completed: ${completed}, Total: $${totalDistributed.toFixed(2)}`;
    console.info(`[CRON] Distribution complete: ${summary}`);

    // Recalculate team bonus for all users with active investments
    try {
      const usersWithInvestments = await db.user.findMany({
        where: { investments: { some: { status: 'active' } } },
        select: { id: true },
      });

      for (const u of usersWithInvestments) {
        const teamBonusPct = await getTeamBonusPct(u.id);
        await db.user.update({
          where: { id: u.id },
          data: { teamBonusPct: teamBonusPct.toString() },
        });
        
        // Update all active investments' teamBonusPct for this user
        await db.investment.updateMany({
          where: { userId: u.id, status: 'active' },
          data: { teamBonusPct: teamBonusPct.toString() },
        });
      }
      console.info(`[CRON] Updated team bonus for ${usersWithInvestments.length} users`);
    } catch (teamBonusErr) {
      console.error('[CRON] Team bonus update error:', teamBonusErr);
      errors.push('Team bonus update error');
    }

    return apiSuccess({
      message: `Distribuição concluída: ${processed} investimentos processados`,
      processed,
      skipped,
      completed: completed > 0 ? completed : undefined,
      totalDistributed: dusdt(totalDistributed),
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
    } finally {
      // Release PostgreSQL advisory lock
      await releaseAdvisoryLock(12345);
    }
  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    return handleApiError(error);
  }
}

// GET endpoint to check next distribution time (for frontend countdown)
export async function GET(request: NextRequest) {
  // Calculate time until next midnight UTC
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  nextMidnight.setUTCHours(0, 0, 0, 0);

  const msUntilNext = nextMidnight.getTime() - now.getTime();
  const hoursUntilNext = Math.floor(msUntilNext / (1000 * 60 * 60));
  const minutesUntilNext = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));
  const secondsUntilNext = Math.floor((msUntilNext % (1000 * 60)) / 1000);

  return apiSuccess({
    nextDistribution: nextMidnight.toISOString(),
    hoursUntil: hoursUntilNext,
    minutesUntil: minutesUntilNext,
    secondsUntil: secondsUntilNext,
    schedule: '0 0 * * *', // Daily at midnight UTC
  });
}
