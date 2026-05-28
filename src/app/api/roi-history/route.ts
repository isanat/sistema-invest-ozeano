import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/roi-history — Returns ROI history for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const investmentId = url.searchParams.get('investmentId') || undefined;

    // Fetch ROI history (ordered by most recent distribution)
    const whereClause: any = { userId };
    if (investmentId) whereClause.investmentId = investmentId;

    const history = await db.roiHistory.findMany({
      where: whereClause,
      orderBy: { distributedAt: 'desc' },
      take: limit,
      include: {
        investment: {
          select: { id: true, amount: true, dailyRoiPct: true, plan: { select: { name: true } } },
        },
      },
    });

    // Calculate today's total earnings (based on distributedAt being today)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayHistory = await db.roiHistory.findMany({
      where: {
        userId,
        distributedAt: { gte: today, lt: tomorrow },
      },
    });

    const todayEarnings = todayHistory.reduce((sum, h) => {
      const val = parseFloat(h.totalRoi || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // Get last 7 days earnings for chart
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyHistory = await db.roiHistory.findMany({
      where: {
        userId,
        distributedAt: { gte: sevenDaysAgo },
      },
      orderBy: { distributedAt: 'asc' },
    });

    // Group by day
    const weeklyEarnings: Record<string, number> = {};
    weeklyHistory.forEach(h => {
      const dayKey = new Date(h.distributedAt).toISOString().split('T')[0];
      const val = parseFloat(h.totalRoi || '0');
      weeklyEarnings[dayKey] = (weeklyEarnings[dayKey] || 0) + (isNaN(val) ? 0 : val);
    });

    return apiSuccess({
      history,
      todayEarnings: todayEarnings.toFixed(2),
      weeklyEarnings,
      totalRecords: history.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
