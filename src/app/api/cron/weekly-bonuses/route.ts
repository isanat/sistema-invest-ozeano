// ============================================================================
// CRON: Weekly Team Bonuses (AC-09 Salary + AC-10 Action Gold)
// ============================================================================
// Runs every Sunday at 00:00 UTC.
// Phase 1: Distribute Weekly Salary (0.5% of team's active capital)
// Phase 2: Distribute Action Gold (50% of direct referrals' weekly salary)
//
// Idempotency: @@unique([userId, weekDate]) on WeeklySalary
//              @@unique([userId, fromUserId, weekDate]) on ActionGoldPayment
// ============================================================================

import { NextRequest } from 'next/server';
import { db, acquireAdvisoryLock, releaseAdvisoryLock } from '@/lib/db';
import { d, ds } from '@/lib/auth';
import {
  getTeamBonusConfig,
  calculateTeamActiveCapital,
  hasActiveInvestment,
  checkTeamBonusDailyCap,
  getLastSunday,
} from '@/lib/team-bonus';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

const CRON_SECRET = process.env.CRON_SECRET || '';
const IS_VERCEL = process.env.VERCEL === '1';

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET) return true;
  if (IS_VERCEL) {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === 'true') return true;
  }
  if (process.env.NODE_ENV === 'development' && !CRON_SECRET) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return apiError('Não autorizado', 401);
    }

    console.info('[WEEKLY] Starting weekly team bonuses...', new Date().toISOString());

    const lockAcquired = await acquireAdvisoryLock(54321);
    if (!lockAcquired) {
      return apiError('Could not acquire advisory lock - another weekly cron is running', 423);
    }

    try {
      const config = await getTeamBonusConfig();
      const weekDate = getLastSunday();

      // If neither salary nor gold is enabled, skip
      if (!config.salaryEnabled && !config.goldEnabled) {
        return apiSuccess({ message: 'Bônus de equipe desativado', processed: 0 });
      }

      // ====================================================================
      // PHASE 1: AC-09 — WEEKLY SALARY
      // ====================================================================
      let salaryProcessed = 0;
      let salarySkipped = 0;
      const salaryErrors: string[] = [];

      if (config.salaryEnabled) {
        console.info('[WEEKLY] Phase 1: Distributing weekly salaries...');

        // Find all users with at least one active investment
        const users = await db.user.findMany({
          where: {
            isActive: true,
            investments: { some: { status: 'active' } },
          },
          select: { id: true },
        });

        for (const user of users) {
          try {
            // Idempotency check
            const existing = await db.weeklySalary.findUnique({
              where: { userId_weekDate: { userId: user.id, weekDate } },
            });
            if (existing) { salarySkipped++; continue; }

            // Check own investment requirement
            if (config.salaryRequiresOwnInvestment) {
              const hasOwn = await hasActiveInvestment(user.id);
              if (!hasOwn) { salarySkipped++; continue; }
            }

            // Calculate team active capital
            const teamCapital = await calculateTeamActiveCapital(user.id, config.maxDepth);

            // Check minimum team capital
            if (teamCapital < config.salaryMinTeamCapital) { salarySkipped++; continue; }

            // Calculate salary
            const salaryAmount = teamCapital * (config.salaryPct / 100);
            if (salaryAmount <= 0) { salarySkipped++; continue; }

            // Check sustainability cap
            const capCheck = await checkTeamBonusDailyCap(salaryAmount);
            if (!capCheck.allowed) { salarySkipped++; continue; }
            const finalAmount = Math.min(salaryAmount, capCheck.cappedAmount);

            // Execute payment atomically
            await db.$transaction(async (tx) => {
              await tx.weeklySalary.create({
                data: {
                  userId: user.id,
                  weekDate,
                  teamActiveCapital: teamCapital.toFixed(8),
                  salaryPct: config.salaryPct.toString(),
                  salaryAmount: finalAmount.toFixed(8),
                  status: 'paid',
                },
              });

              await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${finalAmount}) AS TEXT) WHERE id = ${user.id}`;

              await tx.transaction.create({
                data: {
                  userId: user.id,
                  type: 'weekly_salary',
                  amount: finalAmount.toFixed(8),
                  status: 'completed',
                  description: `Salário semanal: ${config.salaryPct}% de $${teamCapital.toFixed(2)} capital de equipo`,
                  referenceType: 'WeeklySalary',
                },
              });
            });

            salaryProcessed++;
          } catch (err) {
            console.error(`[WEEKLY] Salary error for user ${user.id}:`, err);
            salaryErrors.push(`User ${user.id}: ${err}`);
          }
        }

        console.info(`[WEEKLY] Phase 1 complete: ${salaryProcessed} salaries paid, ${salarySkipped} skipped`);
      }

      // ====================================================================
      // PHASE 2: AC-10 — ACTION GOLD
      // ====================================================================
      let goldProcessed = 0;
      let goldSkipped = 0;
      const goldErrors: string[] = [];

      if (config.goldEnabled) {
        console.info('[WEEKLY] Phase 2: Distributing Action Gold...');

        // Get all paid salaries from this week
        const paidSalaries = await db.weeklySalary.findMany({
          where: { weekDate, status: 'paid' },
          select: { userId: true, salaryAmount: true },
        });

        for (const salary of paidSalaries) {
          try {
            // Find the direct referrer (who invited this user)
            const salaryUser = await db.user.findUnique({
              where: { id: salary.userId },
              select: { referredBy: true },
            });

            if (!salaryUser?.referredBy) { goldSkipped++; continue; }

            const referrer = await db.user.findUnique({
              where: { id: salaryUser.referredBy },
              select: { id: true, isActive: true },
            });

            if (!referrer?.isActive) { goldSkipped++; continue; }

            // Idempotency check
            const existingGold = await db.actionGoldPayment.findUnique({
              where: {
                userId_fromUserId_weekDate: {
                  userId: referrer.id,
                  fromUserId: salary.userId,
                  weekDate,
                },
              },
            });
            if (existingGold) { goldSkipped++; continue; }

            // Check referrer's team capital for Gold qualification
            const referrerTeamCapital = await calculateTeamActiveCapital(referrer.id, config.maxDepth);
            if (referrerTeamCapital < config.goldMinTeamCapital) { goldSkipped++; continue; }

            // Check referrer has own investment
            const referrerHasOwn = await hasActiveInvestment(referrer.id);
            if (!referrerHasOwn) { goldSkipped++; continue; }

            // Calculate Gold: ONLY on base salary (anti-cascade)
            const salaryAmount = d(salary.salaryAmount);
            const goldAmount = salaryAmount * (config.goldPct / 100);
            if (goldAmount <= 0) { goldSkipped++; continue; }

            // Check sustainability cap
            const capCheck = await checkTeamBonusDailyCap(goldAmount);
            if (!capCheck.allowed) { goldSkipped++; continue; }
            const finalGold = Math.min(goldAmount, capCheck.cappedAmount);

            // Execute payment atomically
            await db.$transaction(async (tx) => {
              await tx.actionGoldPayment.create({
                data: {
                  userId: referrer.id,
                  fromUserId: salary.userId,
                  weekDate,
                  fromSalaryAmount: salary.salaryAmount,
                  goldPct: config.goldPct.toString(),
                  goldAmount: finalGold.toFixed(8),
                  status: 'paid',
                },
              });

              await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${finalGold}) AS TEXT) WHERE id = ${referrer.id}`;

              await tx.transaction.create({
                data: {
                  userId: referrer.id,
                  type: 'action_gold',
                  amount: finalGold.toFixed(8),
                  status: 'completed',
                  description: `Action Gold: ${config.goldPct}% do salário semanal de seu direto ($${salaryAmount.toFixed(2)})`,
                  referenceType: 'ActionGoldPayment',
                },
              });
            });

            goldProcessed++;
          } catch (err) {
            console.error(`[WEEKLY] Gold error for salary ${salary.userId}:`, err);
            goldErrors.push(`Gold for ${salary.userId}: ${err}`);
          }
        }

        console.info(`[WEEKLY] Phase 2 complete: ${goldProcessed} gold payments, ${goldSkipped} skipped`);
      }

      const allErrors = [...salaryErrors, ...goldErrors];
      return apiSuccess({
        message: `Bônus semanais processados: ${salaryProcessed} salários, ${goldProcessed} gold`,
        weekDate: weekDate.toISOString(),
        salary: { processed: salaryProcessed, skipped: salarySkipped, errors: salaryErrors.length > 0 ? salaryErrors : undefined },
        gold: { processed: goldProcessed, skipped: goldSkipped, errors: goldErrors.length > 0 ? goldErrors : undefined },
      });
    } finally {
      await releaseAdvisoryLock(54321);
    }
  } catch (error) {
    console.error('[WEEKLY] Fatal error:', error);
    return handleApiError(error);
  }
}

// GET: Next weekly payment countdown
export async function GET(request: NextRequest) {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);

  const msUntilNext = nextSunday.getTime() - now.getTime();
  const daysUntil = Math.floor(msUntilNext / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((msUntilNext % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));

  return apiSuccess({
    nextPayment: nextSunday.toISOString(),
    daysUntil,
    hoursUntil,
    minutesUntil,
    schedule: '0 0 * * 0', // Every Sunday at midnight UTC
  });
}
