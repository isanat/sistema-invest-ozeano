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
        totalMined: true,
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
  } catch (error) {
    return handleApiError(error);
  }
}
