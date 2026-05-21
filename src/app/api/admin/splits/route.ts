import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// GET /api/admin/splits — Summary of split system (redirects to new multi-recipient system)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Get split recipients summary
    const recipients = await db.splitRecipient.findMany({
      where: { isActive: true },
    });

    // Get deposits that have splits processed
    const splitDeposits = await db.nowPaymentsDeposit.findMany({
      where: { splitProcessed: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const totalSplitAmount = splitDeposits.reduce(
      (sum, dep) => sum + d(dep.splitTotalAmount),
      0
    );

    const totalPctAllocated = recipients.reduce((s, r) => s + d(r.percentage), 0);
    const totalAccumulated = recipients.reduce((s, r) => s + d(r.accumulatedBalance), 0);
    const totalSent = recipients.reduce((s, r) => s + d(r.totalSent), 0);

    return apiSuccess({
      summary: {
        activeCount: recipients.length,
        totalPctAllocated,
        totalAccumulated,
        totalSent,
        overAllocated: totalPctAllocated > 100,
      },
      recipients,
      splitDeposits,
      totalSplitAmount,
      totalSplitDeposits: splitDeposits.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
