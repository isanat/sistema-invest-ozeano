import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const miners = await db.miner.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        plans: {
          where: { isActive: true },
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { days: 'asc' }],
        },
      },
    });

    return apiSuccess({ miners });
  } catch (error) {
    return handleApiError(error);
  }
}
