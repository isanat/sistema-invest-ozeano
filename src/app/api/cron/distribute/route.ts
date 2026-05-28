import { NextRequest } from 'next/server';
import { db, isPostgres, acquireAdvisoryLock, releaseAdvisoryLock } from '@/lib/db';
import { d, ds, dusdt } from '@/lib/auth';
import { processCommissions, getTeamBonusPct } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// ============================================================================
// CRON: Daily ROI Distribution — 24h per investment
// ============================================================================
// Called by cron-runner every 15 minutes.
// For each active Investment:
//   1. Calculate how many complete 24h periods have passed since startDate
//   2. Distribute ROI for each missing period (catch-up safe)
//   3. Idempotency: @@unique([investmentId, periodIndex]) prevents double pay
//   4. Investment completed after all periods (durationDays) are distributed
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET || '';
const IS_VERCEL = process.env.VERCEL === '1';

// 24 hours in milliseconds
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

    console.info('[CRON] Starting 24h-based ROI distribution...', new Date().toISOString());

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
      return apiSuccess({ message: 'Nenhum investimento ativo', processed: 0 });
    }

    const now = new Date();
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalCompleted = 0;
    let totalDistributed = 0;
    const errors: string[] = [];

    for (const investment of activeInvestments) {
      try {
        const startDate = new Date(investment.startDate);
        const endDate = new Date(investment.endDate);
        const durationDays = investment.plan?.durationDays || Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);

        // ── Calculate completed 24-hour periods since investment start ──
        const msSinceStart = now.getTime() - startDate.getTime();
        const completedPeriods = Math.floor(msSinceStart / MS_PER_DAY); // 0, 1, 2, ...

        // ── If no complete 24-hour period yet, skip (investment < 24h old) ──
        if (completedPeriods < 1) {
          totalSkipped++;
          continue;
        }

        // ── Check if investment has completed all periods → mark as completed ──
        // An investment with durationDays=40 should have periods 1 through 40
        if (completedPeriods >= durationDays) {
          // First, distribute any remaining undistributed periods up to durationDays
          const lastDistributed = investment.distributedPeriods || 0;
          for (let period = lastDistributed + 1; period <= durationDays; period++) {
            try {
              await distributeRoiForPeriod(investment, period, now);
              totalProcessed++;
              totalDistributed += 1;
            } catch (periodErr: any) {
              console.error(`[CRON] Error distributing period ${period} for investment ${investment.id}:`, periodErr);
              errors.push(`Investment ${investment.id} period ${period}: ${periodErr.message}`);
            }
          }

          // Mark investment as completed
          await db.investment.update({
            where: { id: investment.id },
            data: { status: 'completed' },
          });
          totalCompleted++;
          continue;
        }

        // ── Distribute ROI for each missing period ──
        const lastDistributed = investment.distributedPeriods || 0;
        if (completedPeriods <= lastDistributed) {
          // All periods up to completedPeriods have already been distributed
          totalSkipped++;
          continue;
        }

        // Distribute each missing period (catch-up: if cron was down, all missed periods are paid)
        for (let period = lastDistributed + 1; period <= completedPeriods; period++) {
          try {
            await distributeRoiForPeriod(investment, period, now);
            totalProcessed++;
            totalDistributed += 1;
          } catch (periodErr: any) {
            console.error(`[CRON] Error distributing period ${period} for investment ${investment.id}:`, periodErr);
            errors.push(`Investment ${investment.id} period ${period}: ${periodErr.message}`);
            // If a specific period fails (e.g. unique constraint violation), skip it
            // The @@unique([investmentId, periodIndex]) ensures idempotency
            if (periodErr.code === 'P2002') {
              // Unique constraint violation — already distributed, skip
              continue;
            }
          }
        }

      } catch (investmentErr: any) {
        console.error('[CRON] Distribution error for investment', investment.id, investmentErr);
        errors.push(`Investment ${investment.id}: ${investmentErr.message}`);
      }
    }

    const summary = `Processed: ${totalProcessed}, Skipped: ${totalSkipped}, Completed: ${totalCompleted}, Distributed periods: ${totalDistributed}`;
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
      message: `Distribuição concluída: ${totalProcessed} períodos processados`,
      processed: totalProcessed,
      skipped: totalSkipped,
      completed: totalCompleted > 0 ? totalCompleted : undefined,
      totalDistributedPeriods: totalDistributed,
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

// ============================================================================
// Helper: Distribute ROI for a single 24-hour period of an investment
// ============================================================================
async function distributeRoiForPeriod(
  investment: any,
  periodIndex: number,
  distributedAt: Date
): Promise<string> {
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
  const totalRoiForPeriod = dailyROI + teamBonus;

  // Skip if zero ROI (edge case)
  if (totalRoiForPeriod <= 0) {
    // Still mark this period as distributed to avoid re-processing
    await db.investment.update({
      where: { id: investment.id },
      data: {
        lastRoiAt: distributedAt,
        distributedPeriods: periodIndex,
      },
    });
    return '';
  }

  // Use transaction for atomicity
  const roiHistoryId = await db.$transaction(async (tx) => {
    // Create ROI history record with periodIndex (idempotency via @@unique)
    const roiHistory = await tx.roiHistory.create({
      data: {
        userId: investment.userId,
        investmentId: investment.id,
        periodIndex,
        distributedAt,
        roiAmount: ds(dailyROI),
        roiPct: ds(dailyRoiPct),
        teamBonus: ds(teamBonus),
        totalRoi: ds(totalRoiForPeriod),
      },
    });

    // Credit user balance atomically using raw SQL (PostgreSQL)
    await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${totalRoiForPeriod}) AS TEXT), "totalRoi" = CAST((CAST("totalRoi" AS NUMERIC) + ${totalRoiForPeriod}) AS TEXT) WHERE id = ${investment.userId}`;

    // Update investment accumulated ROI + tracking fields
    await tx.$executeRaw`UPDATE "Investment" SET "accumulatedRoi" = CAST((CAST("accumulatedRoi" AS NUMERIC) + ${totalRoiForPeriod}) AS TEXT), "lastRoiAt" = ${distributedAt}, "distributedPeriods" = ${periodIndex} WHERE id = ${investment.id}`;

    // Create transaction record
    const planName = investment.plan?.name || 'Plano';
    await tx.transaction.create({
      data: {
        userId: investment.userId,
        type: 'roi_profit',
        amount: ds(totalRoiForPeriod),
        status: 'completed',
        description: `ROI diário #${periodIndex} ${planName}${teamBonusPct > 0 ? ` (+${teamBonusPct}% Team Bonus)` : ''}`,
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
      await processCommissions(investment.userId, totalRoiForPeriod, 'trading', roiHistoryId);
    } catch (commErr) {
      console.error('[CRON] Commission error for investment', investment.id, commErr);
      // Don't fail the whole distribution for a commission error
    }
  }

  return roiHistoryId;
}

// ============================================================================
// GET endpoint — Returns per-investment next ROI time for frontend countdown
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // For unauthenticated users, return generic schedule info
    const now = new Date();
    
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    let userInvestments: any[] = [];
    
    if (authHeader) {
      try {
        // Extract user from session token
        const token = authHeader.replace('Bearer ', '');
        // Simple session check — in production, verify properly
        const session = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
          headers: { cookie: `next-auth.session-token=${token}` },
        }).then(r => r.json()).catch(() => null);
        
        if (session?.user?.id) {
          userInvestments = await db.investment.findMany({
            where: { 
              userId: session.user.id,
              status: 'active' 
            },
            select: { 
              id: true, 
              startDate: true, 
              distributedPeriods: true,
              amount: true,
              dailyRoiPct: true,
              plan: { select: { durationDays: true } },
            },
            orderBy: { startDate: 'asc' },
          });
        }
      } catch (e) {
        // Ignore auth errors for GET endpoint
      }
    }

    // Calculate next ROI time for each investment
    const investmentTimings = userInvestments.map(inv => {
      const startDate = new Date(inv.startDate);
      const durationDays = inv.plan?.durationDays || 30;
      const nextPeriodIndex = (inv.distributedPeriods || 0) + 1;
      
      // Next ROI time = startDate + (nextPeriodIndex * 24h)
      const nextRoiAt = new Date(startDate.getTime() + nextPeriodIndex * MS_PER_DAY);
      const msUntilNext = Math.max(0, nextRoiAt.getTime() - now.getTime());
      
      return {
        investmentId: inv.id,
        nextPeriodIndex,
        nextRoiAt: nextRoiAt.toISOString(),
        msUntilNext,
        hoursUntil: Math.floor(msUntilNext / (1000 * 60 * 60)),
        minutesUntil: Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60)),
        secondsUntil: Math.floor((msUntilNext % (1000 * 60)) / 1000),
        totalPeriods: durationDays,
        completedPeriods: inv.distributedPeriods || 0,
      };
    });

    // Find the soonest next ROI across all investments
    const soonest = investmentTimings.length > 0 
      ? investmentTimings.reduce((min, t) => t.msUntilNext < min.msUntilNext ? t : min, investmentTimings[0])
      : null;

    return apiSuccess({
      schedule: 'every_15_minutes',
      cronInterval: 15 * 60 * 1000, // 15 minutes in ms
      investments: investmentTimings,
      nextRoi: soonest ? {
        investmentId: soonest.investmentId,
        nextRoiAt: soonest.nextRoiAt,
        hoursUntil: soonest.hoursUntil,
        minutesUntil: soonest.minutesUntil,
        secondsUntil: soonest.secondsUntil,
      } : null,
      explanation: 'Cada investimento recebe ROI 24h após sua criação, não em horário fixo',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
