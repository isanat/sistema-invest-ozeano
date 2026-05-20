import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        walletAddress: true,
        pixKey: true,
        balance: true,
        affiliateBalance: true,
        voucherBalance: true,
        totalRoi: true,
        totalInvested: true,
        totalWithdrawn: true,
        affiliateCode: true,
        referredBy: true,
        referralLevel: true,
        totalAffiliateEarnings: true,
        hasInvested: true,
        linkUnlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return apiSuccess({ user: null }, 404);
    }

    return apiSuccess({ user });
  } catch (error: any) {
    // If no session / Unauthorized, return a graceful 200 with user: null
    // instead of a 401/500 so the client can handle it cleanly.
    const message = error?.message || String(error);
    if (message === 'Unauthorized' || message.includes('Unauthorized')) {
      return apiSuccess({ user: null });
    }
    // For any other error, still return a proper response instead of crashing with 500
    return handleApiError(error);
  }
}
