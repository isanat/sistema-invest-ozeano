import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';
import { verifyPinForAction } from '@/lib/admin-pin-middleware';

// POST /api/admin/force-release-lock — Force-release all PostgreSQL advisory locks
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    // Require PIN verification via x-admin-pin header or body PIN
    const headerPin = request.headers.get('x-admin-pin');
    const body = await request.json().catch(() => ({}));
    const bodyPin = body.pin;

    if (headerPin) {
      const pinResult = await verifyPinForAction(request, 'force_release');
      if (!pinResult.success) {
        return apiError(pinResult.error!, 403);
      }
    } else if (bodyPin) {
      const pinValid = await verifyAdminPin(session.userId, bodyPin);
      if (!pinValid) {
        return apiError('PIN de segurança inválido', 403);
      }
    } else {
      return apiError('PIN de segurança é obrigatório para esta ação', 403);
    }

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

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'force_release_lock',
        entity: 'system',
        description: 'Advisory locks released via force-release-lock endpoint',
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: 'Advisory locks released' });
  } catch (error) {
    return handleApiError(error);
  }
}
