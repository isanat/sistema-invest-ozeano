import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || ''; // 'deposit' or 'withdrawal'
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { userId: session.userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [investments, total] = await Promise.all([
      db.investment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.investment.count({ where }),
    ]);

    // Get summary stats
    const allInvestments = await db.investment.findMany({
      where: { userId: session.userId },
      select: { type: true, amount: true, status: true },
    });

    const stats = {
      totalDeposited: allInvestments
        .filter(i => i.type === 'deposit' && i.status === 'approved')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0),
      totalWithdrawn: allInvestments
        .filter(i => i.type === 'withdrawal' && i.status === 'approved')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0),
      pendingDeposits: allInvestments
        .filter(i => i.type === 'deposit' && i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0),
      pendingWithdrawals: allInvestments
        .filter(i => i.type === 'withdrawal' && i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0),
      totalDeposits: allInvestments.filter(i => i.type === 'deposit').length,
      totalWithdrawals: allInvestments.filter(i => i.type === 'withdrawal').length,
    };

    return apiSuccess({
      investments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
