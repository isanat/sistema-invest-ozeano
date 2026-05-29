import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, extendDays, revokeReason, adminNotes } = body;

    if (!action) {
      return apiError('Ação é obrigatória (revoke, extend, complete)');
    }

    const voucher = await db.voucher.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!voucher) {
      return apiError('Voucher não encontrado', 404);
    }

    if (voucher.status !== 'active') {
      return apiError(`Não é possível modificar um voucher com status "${voucher.status}"`);
    }

    if (action === 'revoke') {
      // Revoke: set status to revoked, subtract remaining balance from user
      const remainingBalance = d(voucher.amount) - d(voucher.usedAmount);

      await db.$transaction(async (tx) => {
        // Update voucher status
        await tx.voucher.update({
          where: { id },
          data: {
            status: 'revoked',
            revokedBy: session.userId,
            revokeReason: revokeReason || null,
            adminNotes: adminNotes || voucher.adminNotes,
          },
        });

        // Subtract remaining voucher balance from user
        if (remainingBalance > 0) {
          await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = CAST(GREATEST(0, CAST("voucherBalance" AS NUMERIC) - ${remainingBalance}) AS TEXT) WHERE id = ${voucher.userId}`;
        }
      });

      // Admin log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'revoke',
          entity: 'voucher',
          entityId: id,
          newValue: JSON.stringify({ revokeReason, remainingBalance: dusdt(remainingBalance) }),
          description: `Voucher revogado: ${dusdt(voucher.amount)} USDT de ${voucher.user.name} (saldo restante: ${dusdt(remainingBalance)} USDT)`,
          ipAddress: getIpFromRequest(request),
        },
      });

      const updated = await db.voucher.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return apiSuccess({ voucher: updated });

    } else if (action === 'extend') {
      if (!extendDays || extendDays <= 0) {
        return apiError('Dias para extensão deve ser maior que zero');
      }

      const newDeadline = new Date(voucher.deadline);
      newDeadline.setDate(newDeadline.getDate() + extendDays);

      const updated = await db.voucher.update({
        where: { id },
        data: {
          deadline: newDeadline,
          extendedDays: voucher.extendedDays + extendDays,
          adminNotes: adminNotes || voucher.adminNotes,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Admin log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'extend',
          entity: 'voucher',
          entityId: id,
          newValue: JSON.stringify({ extendDays, newDeadline: newDeadline.toISOString() }),
          description: `Voucher estendido por ${extendDays} dias: ${voucher.user.name}`,
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ voucher: updated });

    } else if (action === 'complete') {
      // Force complete: set status to completed, withdrawal unlock 100%
      const updated = await db.voucher.update({
        where: { id },
        data: {
          status: 'completed',
          withdrawalUnlockPct: '100',
          completedAt: new Date(),
          adminNotes: adminNotes || voucher.adminNotes,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Admin log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'complete',
          entity: 'voucher',
          entityId: id,
          description: `Voucher marcado como completo: ${dusdt(voucher.amount)} USDT de ${voucher.user.name}`,
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ voucher: updated });

    } else {
      return apiError('Ação inválida. Use: revoke, extend, ou complete');
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const voucher = await db.voucher.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!voucher) {
      return apiError('Voucher não encontrado', 404);
    }

    // Only allow deleting active or expired vouchers
    if (voucher.status !== 'active' && voucher.status !== 'expired') {
      return apiError('Apenas vouchers ativos ou expirados podem ser excluídos');
    }

    const remainingBalance = d(voucher.amount) - d(voucher.usedAmount);

    await db.$transaction(async (tx) => {
      // Subtract remaining balance from user's voucherBalance
      if (remainingBalance > 0) {
        await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = CAST(GREATEST(0, CAST("voucherBalance" AS NUMERIC) - ${remainingBalance}) AS TEXT) WHERE id = ${voucher.userId}`;
      }

      // Delete voucher usages first (cascade should handle this but explicit is safer)
      await tx.voucherUsage.deleteMany({ where: { voucherId: id } });

      // Delete the voucher
      await tx.voucher.delete({ where: { id } });
    });

    // Admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'voucher',
        entityId: id,
        oldValue: JSON.stringify(voucher),
        description: `Voucher excluído: ${dusdt(voucher.amount)} USDT de ${voucher.user.name} (saldo restante removido: ${dusdt(remainingBalance)} USDT)`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: 'Voucher excluído com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
