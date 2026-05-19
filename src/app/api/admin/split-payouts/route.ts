import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Get deposits with split info (all deposits that had splits applied)
    const splitDeposits = await db.nowPaymentsDeposit.findMany({
      where: {
        splitProcessed: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    // Calculate totals
    const totalSplitAmount = splitDeposits.reduce(
      (sum, dep) => sum + d(dep.splitAmount),
      0
    );

    const totalDeposited = splitDeposits.reduce(
      (sum, dep) => sum + d(dep.priceAmount),
      0
    );

    return apiSuccess({
      payouts: splitDeposits.map((dep) => ({
        id: dep.id,
        userId: dep.userId,
        userName: dep.user?.name || 'Usuário',
        userEmail: dep.user?.email || '',
        depositAmount: dep.priceAmount,
        splitAmount: dep.splitAmount,
        splitPct: dep.splitPct,
        depositStatus: dep.paymentStatus,
        depositDate: dep.createdAt,
        confirmedAt: dep.confirmedAt,
      })),
      summary: {
        totalSplitPayouts: splitDeposits.length,
        totalSplitAmount,
        totalDeposited,
        averageSplitPct: totalDeposited > 0 ? ((totalSplitAmount / totalDeposited) * 100).toFixed(2) : '0',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
