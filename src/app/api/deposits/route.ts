import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/deposits — Returns deposit/withdrawal history for the authenticated user
// Uses the Deposit model (formerly the old Investment model for deposits/withdrawals)
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

    const [deposits, total] = await Promise.all([
      db.deposit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.deposit.count({ where }),
    ]);

    // Get summary stats
    const allDeposits = await db.deposit.findMany({
      where: { userId: session.userId },
      select: { type: true, amount: true, status: true },
    });

    const stats = {
      totalDeposited: allDeposits
        .filter(d => d.type === 'deposit' && d.status === 'confirmed')
        .reduce((sum, d) => sum + parseFloat(d.amount), 0),
      totalWithdrawn: allDeposits
        .filter(d => d.type === 'withdrawal' && d.status === 'confirmed')
        .reduce((sum, d) => sum + parseFloat(d.amount), 0),
      pendingDeposits: allDeposits
        .filter(d => d.type === 'deposit' && d.status === 'pending')
        .reduce((sum, d) => sum + parseFloat(d.amount), 0),
      pendingWithdrawals: allDeposits
        .filter(d => d.type === 'withdrawal' && d.status === 'pending')
        .reduce((sum, d) => sum + parseFloat(d.amount), 0),
      totalDeposits: allDeposits.filter(d => d.type === 'deposit').length,
      totalWithdrawals: allDeposits.filter(d => d.type === 'withdrawal').length,
    };

    return apiSuccess({
      deposits,
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
