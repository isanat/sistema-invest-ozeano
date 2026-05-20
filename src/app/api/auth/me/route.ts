import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Use getSession() instead of requireAuth() to avoid throwing on no session
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json({ success: true, user: null });
    }

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
      return NextResponse.json({ success: true, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    // NEVER return 500 for this route — always return a graceful response
    // This prevents the frontend from crashing when auth check fails
    console.error('[/api/auth/me] Error:', error?.message || error);
    return NextResponse.json({ success: true, user: null });

  }
}
