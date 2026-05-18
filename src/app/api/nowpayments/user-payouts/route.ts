import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get all withdrawal investments for the user
    const where: any = { userId: session.userId, type: 'withdrawal' };
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

    // Get NowPayments payout details for these investments
    const investmentIds = investments.map((i) => i.id);
    const npPayouts = await db.nowPaymentsPayout.findMany({
      where: {
        investmentId: { in: investmentIds },
      },
    });

    // Create a map of investmentId -> NowPaymentsPayout
    const npPayoutMap = new Map(npPayouts.map((np) => [np.investmentId, np]));

    // Combine data
    const withdrawals = investments.map((inv) => {
      const npPayout = npPayoutMap.get(inv.id) || null;
      return {
        ...inv,
        nowpayments: npPayout
          ? {
              id: npPayout.id,
              batchId: npPayout.nowpaymentsBatchId,
              withdrawalId: npPayout.nowpaymentsWithdrawalId,
              currency: npPayout.currency,
              destinationAddress: npPayout.destinationAddress,
              payoutStatus: npPayout.payoutStatus,
              fee: npPayout.fee,
              netAmount: npPayout.netAmount,
              txHash: npPayout.txHash,
              processedAt: npPayout.processedAt,
              completedAt: npPayout.completedAt,
            }
          : null,
      };
    });

    // Calculate summary stats
    const allWithdrawals = await db.investment.findMany({
      where: { userId: session.userId, type: 'withdrawal' },
      select: { amount: true, status: true },
    });

    const stats = {
      totalWithdrawn: allWithdrawals
        .filter((i) => i.status === 'confirmed' || i.status === 'approved')
        .reduce((s, i) => s + d(i.amount), 0),
      pendingAmount: allWithdrawals
        .filter((i) => i.status === 'pending')
        .reduce((s, i) => s + d(i.amount), 0),
      totalWithdrawals: allWithdrawals.length,
      completedCount: allWithdrawals.filter(
        (i) => i.status === 'confirmed' || i.status === 'approved'
      ).length,
      pendingCount: allWithdrawals.filter((i) => i.status === 'pending').length,
    };

    return apiSuccess({
      withdrawals,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
