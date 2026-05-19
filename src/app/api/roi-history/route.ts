import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/roi-history — Returns ROI history for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const investmentId = url.searchParams.get('investmentId') || undefined;

    // Get today's date (start of day UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Fetch ROI history
    const whereClause: any = { userId };
    if (investmentId) whereClause.investmentId = investmentId;

    const history = await db.roiHistory.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        investment: {
          select: { id: true, amount: true, dailyRoiPct: true, plan: { select: { name: true } } },
        },
      },
    });

    // Calculate today's total earnings
    const todayHistory = await db.roiHistory.findMany({
      where: {
        userId,
        date: { gte: today },
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
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Group by day
    const weeklyEarnings: Record<string, number> = {};
    weeklyHistory.forEach(h => {
      const dayKey = new Date(h.date).toISOString().split('T')[0];
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
