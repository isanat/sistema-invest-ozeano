import { NextResponse } from 'next/server';
import { getTradingStats, getPlatformStats } from '@/lib/market-data';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const [tradingStats, platformStats] = await Promise.all([
      getTradingStats(),
      getPlatformStats(),
    ]);

    return apiSuccess({
      trading: tradingStats,
      platform: platformStats,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
