import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/plans — Returns active investment plans for the public
export async function GET(request: NextRequest) {
  try {
    const plans = await db.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { investments: { where: { status: 'active' } } },
        },
      },
    });

    return apiSuccess({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}
