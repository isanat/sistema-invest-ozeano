import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const traders = await db.copyTrader.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
    return apiSuccess({ traders });
  } catch (error) {
    return handleApiError(error);
  }
}
