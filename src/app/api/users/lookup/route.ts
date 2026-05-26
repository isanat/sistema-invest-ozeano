import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

// Look up a user by email (for transfer recipient verification)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return apiError('E-mail é obrigatório', 400);
    }

    // Only return name and email — no sensitive data
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return apiSuccess({ user: null });
    }

    // Don't return the user's own info
    if (user.id === session.userId) {
      return apiSuccess({ user: null, isSelf: true });
    }

    return apiSuccess({
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
