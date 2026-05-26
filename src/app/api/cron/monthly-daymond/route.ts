// ============================================================================
// CRON: Monthly Action Daymond (AC-11)
// ============================================================================
// Runs on the 1st of each month at 00:00 UTC.
// Creates a virtual Investment of $1000 for qualified users.
//
// QUALIFICATION:
// - teamActiveCapital >= $20,000 (configurable)
// - Has own active investment (deposit or voucher funded)
//
// KEY ANTI-FRAUD:
// - Daymond investments have source='daymond'
// - Daymond investments do NOT count toward team capital of uplines
// - Daymond investments do NOT generate affiliate commissions by default
// - If team drops below minimum, no new package is created next month
//
// Idempotency: @@unique([userId, monthDate]) on DaymondPackage
// ============================================================================

import { NextRequest } from 'next/server';
import { db, acquireAdvisoryLock, releaseAdvisoryLock } from '@/lib/db';
import { d, ds } from '@/lib/auth';
import {
  getTeamBonusConfig,
  calculateTeamActiveCapital,
  hasActiveInvestment,
  getFirstOfMonth,
} from '@/lib/team-bonus';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { processCommissions } from '@/lib/affiliate';

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

    console.info('[DAYMOND] Starting monthly Daymond processing...', new Date().toISOString());

    const lockAcquired = await acquireAdvisoryLock(67890);
    if (!lockAcquired) {
      return apiError('Could not acquire advisory lock - another Daymond cron is running', 423);
    }

    try {
      const config = await getTeamBonusConfig();

      if (!config.daymondEnabled) {
        return apiSuccess({ message: 'Action Daymond desativado', processed: 0 });
      }

      const monthDate = getFirstOfMonth();

      // Get daily ROI % from system config
      const roiConfig = await db.systemConfig.findUnique({
        where: { key: 'daily_roi_pct' },
      });
      const dailyRoiPct = roiConfig ? d(roiConfig.value) : d('3.3');

      // Find all users with at least one active investment
      const users = await db.user.findMany({
        where: {
          isActive: true,
          investments: { some: { status: 'active' } },
        },
        select: { id: true },
      });

      let qualified = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const user of users) {
        try {
          // Idempotency check
          const existing = await db.daymondPackage.findUnique({
            where: { userId_monthDate: { userId: user.id, monthDate } },
          });
          if (existing) { skipped++; continue; }

          // Check own investment requirement
          const hasOwn = await hasActiveInvestment(user.id);
          if (!hasOwn) { skipped++; continue; }

          // Calculate team active capital
          const teamCapital = await calculateTeamActiveCapital(user.id, config.maxDepth);

          if (teamCapital < config.daymondMinTeamCapital) {
            // Record as skipped for audit trail
            await db.daymondPackage.create({
              data: {
                userId: user.id,
                monthDate,
                teamActiveCapital: teamCapital.toFixed(8),
                packageAmount: config.daymondPackageAmount.toFixed(8),
                status: 'skipped',
              },
            });
            skipped++;
            continue;
          }

          // QUALIFIED — Create Daymond package
          const packageAmount = config.daymondPackageAmount;
          const dailyRoi = packageAmount * (dailyRoiPct / 100);
          const startDate = new Date();
          const endDate = new Date();
          endDate.setUTCDate(endDate.getUTCDate() + config.daymondDurationDays);

          const result = await db.$transaction(async (tx) => {
            // 1. Create DaymondPackage record
            const pkg = await tx.daymondPackage.create({
              data: {
                userId: user.id,
                monthDate,
                teamActiveCapital: teamCapital.toFixed(8),
                packageAmount: packageAmount.toFixed(8),
                status: 'active',
              },
            });

            // 2. Create virtual Investment (source='daymond', teamBonusPct=0)
            const investment = await tx.investment.create({
              data: {
                userId: user.id,
                amount: packageAmount.toFixed(8),
                dailyRoi: dailyRoi.toFixed(8),
                dailyRoiPct: dailyRoiPct.toString(),
                totalRoi: (dailyRoi * config.daymondDurationDays).toFixed(8),
                startDate,
                endDate,
                status: 'active',
                teamBonusPct: '0', // Daymond does NOT get team bonus
                source: 'daymond',
              },
            });

            // 3. Link DaymondPackage → Investment
            await tx.daymondPackage.update({
              where: { id: pkg.id },
              data: { investmentId: investment.id },
            });

            // 4. Create transaction record
            await tx.transaction.create({
              data: {
                userId: user.id,
                type: 'daymond_package',
                amount: packageAmount.toFixed(8),
                status: 'completed',
                description: `Action Daymond: pacote de $${packageAmount.toFixed(2)} qualificado (${config.daymondDurationDays} dias, ${dailyRoiPct}% ROI/dia)`,
                referenceId: investment.id,
                referenceType: 'Investment',
              },
            });

            return { package: pkg, investment };
          });

          // 5. If Daymond generates commissions (configurable, default=false), process them
          if (config.daymondGeneratesCommissions) {
            try {
              await processCommissions(
                user.id,
                packageAmount,
                'subscription',
                result.investment.id,
              );
            } catch (commErr) {
              console.error(`[DAYMOND] Commission error for ${user.id}:`, commErr);
              errors.push(`Commission error: ${user.id}`);
            }
          }

          qualified++;
        } catch (err) {
          console.error(`[DAYMOND] Error for user ${user.id}:`, err);
          errors.push(`User ${user.id}: ${err}`);
        }
      }

      console.info(`[DAYMOND] Complete: ${qualified} packages created, ${skipped} skipped`);

      return apiSuccess({
        message: `Action Daymond: ${qualified} pacotes criados, ${skipped} sem qualificação`,
        monthDate: monthDate.toISOString(),
        qualified,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      });
    } finally {
      await releaseAdvisoryLock(67890);
    }
  } catch (error) {
    console.error('[DAYMOND] Fatal error:', error);
    return handleApiError(error);
  }
}
