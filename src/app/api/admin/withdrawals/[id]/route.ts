import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { verifyPinForAction } from '@/lib/admin-pin-middleware';
import { verifyAdminPin, adminHasPin } from '@/lib/admin-pin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status, rejectedReason, pin } = body;

    if (!status || !['approved', 'rejected', 'processed'].includes(status)) {
      return apiError('Status inválido. Use: approved, rejected ou processed');
    }

    // Require PIN verification via x-admin-pin header or body PIN
    const pinAction = status === 'rejected' ? 'withdrawal_reject' as const : 'withdrawal_approve' as const;
    const headerPin = request.headers.get('x-admin-pin');
    if (headerPin) {
      const pinResult = await verifyPinForAction(request, pinAction);
      if (!pinResult.success) {
        if (pinResult.error?.includes('não configurado')) {
          return apiError('PIN_NOT_CONFIGURED', 423);
        }
        return apiError(pinResult.error!, 403);
      }
    } else if (pin) {
      // Fallback to body PIN
      const pinValid = await verifyAdminPin(session.userId, pin);
      if (!pinValid) {
        const hasPin = await adminHasPin(session.userId);
        if (!hasPin) {
          return apiError('PIN_NOT_CONFIGURED', 423);
        }
        return apiError('PIN de segurança inválido', 403);
      }
    } else {
      return apiError('PIN de segurança é obrigatório para aprovar/rejeitar saques', 403);
    }

    const withdrawal = await db.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      return apiError('Saque não encontrado', 404);
    }

    if (withdrawal.status !== 'pending') {
      return apiError('Saque já foi processado');
    }

    const ipAddress = getIpFromRequest(request);

    // If rejected, return the amount to user balance
    if (status === 'rejected') {
      await db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
        if (!user) throw new Error('Usuário não encontrado');

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
            approvedBy: session.userId,
            approvedAt: new Date(),
          },
        });
      });

      // Audit log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'reject',
          entity: 'withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status: 'rejected', rejectedReason }),
          description: `Saque rejeitado: ${dusdt(withdrawal.amount)} USDT para ${withdrawal.userId}`,
          ipAddress,
        },
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
            approvedBy: session.userId,
            approvedAt: new Date(),
          },
        });
      });

      // Audit log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: status === 'approved' ? 'approve' : 'complete',
          entity: 'withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status }),
          description: `Saque ${status === 'approved' ? 'aprovado' : 'processado'}: ${dusdt(withdrawal.amount)} USDT para ${withdrawal.userId}`,
          ipAddress,
        },
      });
    }

    const updatedWithdrawal = await db.withdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess({ withdrawal: updatedWithdrawal });
  } catch (error) {
    return handleApiError(error);
  }
}
