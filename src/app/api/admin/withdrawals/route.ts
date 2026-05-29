import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { adminWithdrawalActionSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination, getIpFromRequest } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );
    const status = searchParams.get('status') || '';
    const method = searchParams.get('method') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: any = { type: 'withdrawal' };

    if (status) where.status = status;
    if (method) where.method = method;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [withdrawals, total] = await Promise.all([
      db.deposit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, walletAddress: true, pixKey: true },
          },
        },
      }),
      db.deposit.count({ where }),
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
    const { id, pin, ...actionData } = body;

    if (!id) {
      return apiError('ID do saque é obrigatório');
    }

    // Require PIN for approve/reject actions
    if (!pin) {
      return apiError('PIN de segurança é obrigatório para esta ação', 403);
    }
    const pinValid = await verifyAdminPin(session.userId, pin);
    if (!pinValid) {
      return apiError('PIN de segurança inválido', 403);
    }

    const data = adminWithdrawalActionSchema.parse(actionData);

    if (data.action === 'approve') {
      // Status check inside transaction to prevent race conditions
      const result = await db.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id } });
        if (!deposit) throw new Error('Saque não encontrado');
        if (deposit.status !== 'pending') throw new Error('Saque já foi processado');

        const updated = await tx.deposit.update({
          where: { id },
          data: {
            status: 'confirmed',
            adminNotes: data.adminNotes,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        // Update user total withdrawn atomically using raw SQL
        await tx.$executeRaw`UPDATE "User" SET "totalWithdrawn" = CAST((CAST("totalWithdrawn" AS NUMERIC) + ${d(deposit.amount)}) AS TEXT) WHERE id = ${deposit.userId}`;

        return updated;
      });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'approve',
          entity: 'withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status: 'confirmed' }),
          description: 'Saque aprovado',
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque aprovado com sucesso' });
    }

    if (data.action === 'complete') {
      // Complete action: only accept 'confirmed' (approved) status
      const result = await db.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id } });
        if (!deposit) throw new Error('Saque não encontrado');
        if (deposit.status !== 'confirmed') throw new Error('Saque deve ser aprovado antes de ser concluído');

        const updated = await tx.deposit.update({
          where: { id },
          data: {
            status: 'completed',
            adminNotes: data.adminNotes,
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
          action: 'complete',
          entity: 'withdrawal',
          entityId: id,
          description: 'Saque completado',
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque completado com sucesso' });
    }

    if (data.action === 'reject') {
      // Status check inside transaction to prevent race conditions
      const result = await db.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id } });
        if (!deposit) throw new Error('Saque não encontrado');
        if (deposit.status === 'completed') throw new Error('Saque já foi concluído e não pode ser rejeitado');
        if (deposit.status === 'confirmed') throw new Error('Saque já foi confirmado');
        if (deposit.status === 'rejected') throw new Error('Saque já foi rejeitado');

        // Refund user balance
        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
        if (!user) throw new Error('Usuário não encontrado');

        const newBalance = d(user.balance) + d(deposit.amount);
        await tx.user.update({
          where: { id: deposit.userId },
          data: {
            balance: ds(newBalance),
          },
        });

        // Create refund transaction
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'admin_adjust',
            amount: deposit.amount,
            status: 'completed',
            description: `Reembolso de saque rejeitado: ${dusdt(d(deposit.amount))} USDT`,
            referenceId: deposit.id,
            referenceType: 'Deposit',
          },
        });

        // Update deposit
        const updated = await tx.deposit.update({
          where: { id },
          data: {
            status: 'rejected',
            adminNotes: data.adminNotes,
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
          entity: 'withdrawal',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status: 'rejected' }),
          description: 'Saque rejeitado e valor reembolsado',
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque rejeitado e valor reembolsado' });
    }

    return apiError('Ação inválida');
  } catch (error) {
    return handleApiError(error);
  }
}
