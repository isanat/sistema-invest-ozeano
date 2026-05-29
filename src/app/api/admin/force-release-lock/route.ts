import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// POST /api/admin/force-release-lock — Force-release all PostgreSQL advisory locks
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (isPostgres()) {
      // pg_advisory_unlock_all releases ALL advisory locks held by the current session
      await db.$executeRaw`SELECT pg_advisory_unlock_all()`;
      
      // Also try to unlock the specific lock ID we use (12345)
      try {
        await db.$executeRaw`SELECT pg_advisory_unlock(12345)`;
      } catch {
        // Ignore - lock might not be held by this session
      }
    }

    return apiSuccess({ message: 'Advisory locks released' });
  } catch (error) {
    return handleApiError(error);
  }
}
