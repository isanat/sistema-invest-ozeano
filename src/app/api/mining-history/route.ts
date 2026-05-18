import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/mining-history — Returns mining history for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const rentalId = url.searchParams.get('rentalId') || undefined;

    // Get today's date (start of day UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Fetch mining history
    const whereClause: any = { userId };
    if (rentalId) whereClause.rentalId = rentalId;

    const history = await db.miningHistory.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
    });

    // Calculate today's total earnings
    const todayHistory = await db.miningHistory.findMany({
      where: {
        userId,
        date: { gte: today },
      },
    });

    const todayEarnings = todayHistory.reduce((sum, h) => {
      const val = parseFloat(h.usdtValue || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // Get last 7 days earnings for chart
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyHistory = await db.miningHistory.findMany({
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
      const val = parseFloat(h.usdtValue || '0');
      weeklyEarnings[dayKey] = (weeklyEarnings[dayKey] || 0) + (isNaN(val) ? 0 : val);
    });

    return apiSuccess({
      history,
      todayEarnings: todayEarnings.toFixed(8),
      weeklyEarnings,
      totalRecords: history.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
