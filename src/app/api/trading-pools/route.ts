import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const pools = await db.tradingPool.findMany({
      where: { status: 'active' },
    });
    return apiSuccess({ pools });
  } catch (error) {
    return handleApiError(error);
  }
}
