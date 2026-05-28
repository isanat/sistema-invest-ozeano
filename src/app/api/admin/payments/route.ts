import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, dusdt } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError, sanitizePagination } from '@/lib/api-utils';

// ============================================================================
// ADMIN PAYMENTS DASHBOARD
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const section = searchParams.get('section') || 'overview';

    // ===================== OVERVIEW =====================
    if (section === 'overview') {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

      // ROI stats - use findMany + manual sum (aggregate._sum not available in SQLite)
      const [todayRecords, yesterdayRecords, weekRecords, monthRecords, allRecords] = await Promise.all([
        db.roiHistory.findMany({ where: { distributedAt: { gte: today } }, select: { totalRoi: true } }),
        db.roiHistory.findMany({ where: { distributedAt: { gte: yesterday, lt: today } }, select: { totalRoi: true } }),
        db.roiHistory.findMany({ where: { distributedAt: { gte: sevenDaysAgo } }, select: { totalRoi: true } }),
        db.roiHistory.findMany({ where: { distributedAt: { gte: thirtyDaysAgo } }, select: { totalRoi: true } }),
        db.roiHistory.findMany({ select: { totalRoi: true } }),
      ]);

      const sumRecords = (records: { totalRoi: string }[]) => records.reduce((s, r) => s + d(r.totalRoi), 0);

      // Active investments count
      const activeInvestments = await db.investment.count({ where: { status: 'active' } });

      // Cron logs
      const lastCronRuns = await db.cronLog.findMany({
        where: { type: 'roi_distribute' },
        orderBy: { startedAt: 'desc' },
        take: 10,
      });

      const lastSuccessfulCron = lastCronRuns.find(c => c.status === 'completed');
      const failedCronCount = await db.cronLog.count({ where: { type: 'roi_distribute', status: { in: ['failed', 'partial'] } } });

      // Missed days detection
      const missedDaysInfo = await detectMissedDays();

      // Split summary
      const splitRecipients = await db.splitRecipient.findMany({ where: { isActive: true } });
      const totalAccumulated = splitRecipients.reduce((s, r) => s + d(r.accumulatedBalance), 0);
      const totalSent = splitRecipients.reduce((s, r) => s + d(r.totalSent), 0);
      const failedSplits = await db.splitLog.count({ where: { status: 'failed' } });
      const accumulatedSplits = await db.splitLog.count({ where: { status: 'accumulated' } });

      return apiSuccess({
        roi: {
          today: { amount: dusdt(sumRecords(todayRecords)), count: todayRecords.length },
          yesterday: { amount: dusdt(sumRecords(yesterdayRecords)), count: yesterdayRecords.length },
          week: { amount: dusdt(sumRecords(weekRecords)), count: weekRecords.length },
          month: { amount: dusdt(sumRecords(monthRecords)), count: monthRecords.length },
          allTime: { amount: dusdt(sumRecords(allRecords)), count: allRecords.length },
        },
        activeInvestments,
        cron: {
          lastRun: lastSuccessfulCron ? {
            startedAt: lastSuccessfulCron.startedAt,
            finishedAt: lastSuccessfulCron.finishedAt,
            processed: lastSuccessfulCron.processed,
            skipped: lastSuccessfulCron.skipped,
            completedInv: lastSuccessfulCron.completedInv,
            totalDistributed: lastSuccessfulCron.totalDistributed,
            durationMs: lastSuccessfulCron.durationMs,
            errors: lastSuccessfulCron.errors,
          } : null,
          totalFailed: failedCronCount,
          recentRuns: lastCronRuns.map(r => ({
            id: r.id,
            status: r.status,
            startedAt: r.startedAt,
            finishedAt: r.finishedAt,
            processed: r.processed,
            skipped: r.skipped,
            completedInv: r.completedInv,
            totalDistributed: r.totalDistributed,
            durationMs: r.durationMs,
            errors: r.errors,
          })),
        },
        missedDays: missedDaysInfo,
        splits: {
          activeRecipients: splitRecipients.length,
          totalAccumulated: dusdt(totalAccumulated),
          totalSent: dusdt(totalSent),
          failedSplits,
          accumulatedSplits,
        },
      });
    }

    // ===================== ROI HISTORY =====================
    if (section === 'roi-history') {
      const { page, limit, skip } = sanitizePagination(
        searchParams.get('page') || '1',
        searchParams.get('limit') || '20'
      );
      const userId = searchParams.get('userId') || '';
      const investmentId = searchParams.get('investmentId') || '';
      const startDate = searchParams.get('startDate') || '';
      const endDate = searchParams.get('endDate') || '';

      const where: any = {};
      if (userId) where.userId = userId;
      if (investmentId) where.investmentId = investmentId;
      if (startDate || endDate) {
        where.distributedAt = {};
        if (startDate) where.distributedAt.gte = new Date(startDate);
        if (endDate) where.distributedAt.lte = new Date(endDate);
      }

      const [records, total] = await Promise.all([
        db.roiHistory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { distributedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            investment: {
              select: { id: true, amount: true, dailyRoiPct: true, planId: true, plan: { select: { name: true } } },
            },
          },
        }),
        db.roiHistory.count({ where }),
      ]);

      return apiSuccess({
        records: records.map(r => ({
          id: r.id,
          periodIndex: r.periodIndex,
          distributedAt: r.distributedAt,
          userId: r.userId,
          userName: r.user?.name || '-',
          userEmail: r.user?.email || '-',
          investmentId: r.investmentId,
          planName: r.investment?.plan?.name || 'Custom',
          investmentAmount: r.investment?.amount || '0',
          roiAmount: r.roiAmount,
          roiPct: r.roiPct,
          teamBonus: r.teamBonus,
          totalRoi: r.totalRoi,
          createdAt: r.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ===================== CRON LOGS =====================
    if (section === 'cron-logs') {
      const { page, limit, skip } = sanitizePagination(
        searchParams.get('page') || '1',
        searchParams.get('limit') || '20'
      );

      const [logs, total] = await Promise.all([
        db.cronLog.findMany({
          where: { type: 'roi_distribute' },
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' },
        }),
        db.cronLog.count({ where: { type: 'roi_distribute' } }),
      ]);

      return apiSuccess({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ===================== MISSED DAYS =====================
    if (section === 'missed-days') {
      const missedDaysInfo = await detectMissedDays();
      return apiSuccess(missedDaysInfo);
    }

    // ===================== SPLIT STATUS =====================
    if (section === 'split-status') {
      const recipients = await db.splitRecipient.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          splitLogs: {
            where: { status: 'accumulated' },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      const recentLogs = await db.splitLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          recipient: { select: { name: true, role: true } },
        },
      });

      return apiSuccess({
        recipients: recipients.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          walletAddress: r.walletAddress,
          percentage: r.percentage,
          accumulatedBalance: r.accumulatedBalance,
          totalSent: r.totalSent,
          minPayout: r.minPayout,
          autoPayout: r.autoPayout,
          isActive: r.isActive,
          isFirstRecipient: r.isFirstRecipient,
          pendingLogs: r.splitLogs.length,
        })),
        recentLogs: recentLogs.map(l => ({
          id: l.id,
          recipientName: l.recipient?.name || '-',
          amount: l.amount,
          percentage: l.percentage,
          status: l.status,
          depositId: l.depositId,
          paidAt: l.paidAt,
          createdAt: l.createdAt,
        })),
      });
    }

    return apiError('Seção inválida');
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// MISSED DAYS DETECTION
// ============================================================================
async function detectMissedDays() {
  const now = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const activeInvestments = await db.investment.findMany({
    where: { status: 'active' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { name: true, durationDays: true } },
    },
  });

  const missedDays: any[] = [];

  for (const inv of activeInvestments) {
    const startDate = new Date(inv.startDate);
    const durationDays = inv.plan?.durationDays || 30;
    const completedPeriods = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY);
    const distributedPeriods = inv.distributedPeriods || 0;

    // Find missing periods (periods that should have been distributed but weren't)
    const missingPeriods: number[] = [];
    for (let p = 1; p <= Math.min(completedPeriods, durationDays); p++) {
      if (p > distributedPeriods) {
        missingPeriods.push(p);
      }
    }

    if (missingPeriods.length > 0) {
      missedDays.push({
        investmentId: inv.id,
        userId: inv.userId,
        userName: inv.user?.name || '-',
        userEmail: inv.user?.email || '-',
        planName: inv.plan?.name || 'Custom',
        amount: inv.amount,
        dailyRoi: inv.dailyRoi,
        startDate: inv.startDate,
        endDate: inv.endDate,
        distributedPeriods,
        expectedPeriods: Math.min(completedPeriods, durationDays),
        missingPeriods,
        missedDaysCount: missingPeriods.length,
        estimatedLoss: dusdt(d(inv.dailyRoi) * missingPeriods.length),
      });
    }
  }

  return {
    investmentsWithGaps: missedDays.length,
    totalMissedDays: missedDays.reduce((s, m) => s + m.missedDaysCount, 0),
    totalEstimatedLoss: dusdt(missedDays.reduce((s, m) => s + d(m.estimatedLoss), 0)),
    details: missedDays,
  };
}
