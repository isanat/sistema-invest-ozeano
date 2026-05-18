import { NextResponse } from 'next/server';
import { getNetworkStats, getFearGreedIndex } from '@/lib/market-data';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const [networkStats, fearGreed, poolStatuses] = await Promise.all([
      getNetworkStats(),
      getFearGreedIndex(),
      db.poolStatus.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    return apiSuccess({
      network: networkStats,
      fearGreedIndex: fearGreed,
      pools: poolStatuses,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
