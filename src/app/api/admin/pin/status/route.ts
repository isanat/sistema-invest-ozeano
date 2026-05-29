import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminPinStatus } from '@/lib/admin-pin';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/admin/pin/status — Check if admin has PIN set and when it was last set
// No PIN required to call this
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const status = await getAdminPinStatus(session.userId);

    return apiSuccess({ hasPin: status.hasPin, setAt: status.setAt });
  } catch (error) {
    return handleApiError(error);
  }
}
