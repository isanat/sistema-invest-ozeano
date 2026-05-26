import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectedReason } = body;

    if (!status || !['approved', 'rejected', 'processed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved, rejected, processed) is required' },
        { status: 400 }
      );
    }

    const withdrawal = await db.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Withdrawal has already been processed' },
        { status: 400 }
      );
    }

    // If rejected, return the amount to user balance
    if (status === 'rejected') {
      await db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
        if (!user) throw new Error('User not found');

        const newBalance = (parseFloat(user.balance) + parseFloat(withdrawal.amount)).toFixed(8);
        const newTotalWithdrawn = (parseFloat(user.totalWithdrawn) - parseFloat(withdrawal.amount)).toFixed(8);

        await tx.user.update({
          where: { id: withdrawal.userId },
          data: {
            balance: newBalance,
            totalWithdrawn: newTotalWithdrawn,
          },
        });

        // Update the related transaction status
        await tx.transaction.updateMany({
          where: {
            referenceId: withdrawal.id,
            type: 'withdrawal',
          },
          data: { status: 'cancelled' },
        });

        await tx.withdrawal.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectedReason: rejectedReason || null,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        });
      });
    } else {
      // Approve or process
      await db.$transaction(async (tx) => {
        // Update transaction status
        await tx.transaction.updateMany({
          where: {
            referenceId: withdrawal.id,
            type: 'withdrawal',
          },
          data: { status: 'completed' },
        });

        await tx.withdrawal.update({
          where: { id },
          data: {
            status,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        });
      });
    }

    const updatedWithdrawal = await db.withdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ withdrawal: updatedWithdrawal });
  } catch (error) {
    console.error('Admin process withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
