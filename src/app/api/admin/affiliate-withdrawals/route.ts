import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      db.affiliateWithdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.affiliateWithdrawal.count({ where }),
    ]);

    return apiSuccess({
      withdrawals,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, action, adminNotes } = body;

    if (!id) {
      return apiError('ID do saque afiliado é obrigatório');
    }

    if (!action || !['approve', 'complete', 'reject'].includes(action)) {
      return apiError('Ação inválida. Use: approve, complete ou reject');
    }

    const withdrawal = await db.affiliateWithdrawal.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      return apiError('Saque afiliado não encontrado', 404);
    }

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return apiError('Saque afiliado já foi processado', 400);
      }

      const result = await db.$transaction(async (tx) => {
        const updated = await tx.affiliateWithdrawal.update({
          where: { id },
          data: {
            status: 'approved',
            adminNotes: adminNotes || null,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        return updated;
      });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'approve',
          entity: 'affiliate_withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: withdrawal.status }),
          newValue: JSON.stringify({ status: 'approved' }),
          description: `Saque afiliado aprovado: ${dusdt(withdrawal.amount)} USDT para ${withdrawal.userId}`,
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque afiliado aprovado com sucesso' });
    }

    if (action === 'complete') {
      if (withdrawal.status !== 'approved') {
        return apiError('Saque afiliado precisa estar aprovado para ser completado', 400);
      }

      const result = await db.$transaction(async (tx) => {
        const updated = await tx.affiliateWithdrawal.update({
          where: { id },
          data: {
            status: 'completed',
            adminNotes: adminNotes || withdrawal.adminNotes,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        // Update user's totalWithdrawn atomically (SQLite-compatible)
        await tx.$executeRaw`UPDATE "User" SET "totalWithdrawn" = CAST(CAST("totalWithdrawn" AS REAL) + ${d(withdrawal.netAmount)} AS TEXT) WHERE id = ${withdrawal.userId}`;

        return updated;
      });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'complete',
          entity: 'affiliate_withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: withdrawal.status }),
          newValue: JSON.stringify({ status: 'completed' }),
          description: `Saque afiliado completado: ${dusdt(withdrawal.amount)} USDT para ${withdrawal.userId}`,
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque afiliado completado com sucesso' });
    }

    if (action === 'reject') {
      if (withdrawal.status === 'completed') {
        return apiError('Saque afiliado já foi completado e não pode ser rejeitado', 400);
      }

      if (withdrawal.status === 'rejected') {
        return apiError('Saque afiliado já foi rejeitado', 400);
      }

      const result = await db.$transaction(async (tx) => {
        // Refund affiliate balance atomically (SQLite-compatible)
        await tx.$executeRaw`UPDATE "User" SET "affiliateBalance" = CAST(CAST("affiliateBalance" AS REAL) + ${d(withdrawal.amount)} AS TEXT) WHERE id = ${withdrawal.userId}`;

        // Create refund transaction
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            type: 'admin_adjust',
            amount: withdrawal.amount,
            status: 'completed',
            description: `Reembolso de saque afiliado rejeitado: ${dusdt(withdrawal.amount)} USDT`,
            referenceId: withdrawal.id,
            referenceType: 'AffiliateWithdrawal',
          },
        });

        // Update withdrawal status
        const updated = await tx.affiliateWithdrawal.update({
          where: { id },
          data: {
            status: 'rejected',
            adminNotes: adminNotes || null,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        return updated;
      });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'reject',
          entity: 'affiliate_withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: withdrawal.status }),
          newValue: JSON.stringify({ status: 'rejected' }),
          description: `Saque afiliado rejeitado e reembolsado: ${dusdt(withdrawal.amount)} USDT para ${withdrawal.userId}`,
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque afiliado rejeitado e valor reembolsado' });
    }

    return apiError('Ação inválida');
  } catch (error) {
    return handleApiError(error);
  }
}
