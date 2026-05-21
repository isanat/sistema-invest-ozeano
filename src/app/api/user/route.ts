import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { z } from 'zod/v4';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  walletAddress: z.string().optional(),
  pixKey: z.string().optional(),
});

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
        totalRoi: true,
        totalInvested: true,
        totalDeposited: true,
        totalWithdrawn: true,
        affiliateCode: true,
        referredBy: true,
        referralLevel: true,
        totalAffiliateEarnings: true,
        hasInvested: true,
        linkUnlocked: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            referrals: true,
            investments: { where: { status: 'active' } },
          },
        },
      },
    });

    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    // Get referral count by level
    const referralCounts: Record<number, number> = {};
    for (let level = 1; level <= 11; level++) {
      const count = await getReferralCountAtLevel(session.userId, level);
      referralCounts[level] = count;
    }

    return apiSuccess({
      user: {
        ...user,
        balanceUSDT: d(user.balance),
        affiliateBalanceUSDT: d(user.affiliateBalance),
        referralCounts,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const user = await db.user.update({
      where: { id: session.userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress || null }),
        ...(data.pixKey !== undefined && { pixKey: data.pixKey || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        pixKey: true,
      },
    });

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper: count referrals at a specific level in the chain
async function getReferralCountAtLevel(userId: string, targetLevel: number): Promise<number> {
  // Level 1: direct referrals
  const directReferrals = await db.user.findMany({
    where: { referredBy: userId },
    select: { id: true },
  });

  if (targetLevel === 1) return directReferrals.length;

  // For deeper levels, we need to walk the tree
  let currentLevelIds = directReferrals.map((r) => r.id);
  for (let level = 2; level <= targetLevel; level++) {
    if (currentLevelIds.length === 0) return 0;
    const nextLevel = await db.user.findMany({
      where: { referredBy: { in: currentLevelIds } },
      select: { id: true },
    });
    currentLevelIds = nextLevel.map((r) => r.id);
    if (level === targetLevel) return currentLevelIds.length;
  }

  return 0;
}
