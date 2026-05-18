import { NextResponse } from 'next/server';
import { getUSDTBRLRate } from '@/lib/market-data';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const rate = await getUSDTBRLRate();

    return apiSuccess({
      rate,
      pair: 'USDT/BRL',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
