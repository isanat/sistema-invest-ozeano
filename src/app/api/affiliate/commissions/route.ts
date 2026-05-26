import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/affiliate/commissions - Get paginated commission history
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      db.affiliateCommission.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.affiliateCommission.count({
        where: { userId: auth.userId },
      }),
    ]);

    // Resolve fromUser data manually
    const fromUserIds = [...new Set(commissions.map(c => c.fromUserId))];
    const fromUsers = await db.user.findMany({
      where: { id: { in: fromUserIds } },
      select: { id: true, name: true, email: true, avatar: true },
    });
    const fromUserMap = new Map(fromUsers.map(u => [u.id, u]));

    return NextResponse.json({
      commissions: commissions.map((c) => ({
        id: c.id,
        level: c.level,
        percentage: c.percentage,
        amount: c.amount,
        fromUser: fromUserMap.get(c.fromUserId) || { id: c.fromUserId },
        investmentId: c.investmentId,
        createdAt: c.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
