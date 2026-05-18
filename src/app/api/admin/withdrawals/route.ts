import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { adminWithdrawalActionSchema } from '@/lib/validations';
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

    const [investments, total] = await Promise.all([
      db.investment.findMany({
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
      db.investment.count({ where }),
    ]);

    return apiSuccess({
      withdrawals: investments,
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
    const { id, ...actionData } = body;

    if (!id) {
      return apiError('ID do saque é obrigatório');
    }

    const data = adminWithdrawalActionSchema.parse(actionData);

    if (data.action === 'approve') {
      // Status check inside transaction to prevent race conditions
      const result = await db.$transaction(async (tx) => {
        const investment = await tx.investment.findUnique({ where: { id } });
        if (!investment) throw new Error('Saque não encontrado');
        if (investment.status !== 'pending') throw new Error('Saque já foi processado');

        const updated = await tx.investment.update({
          where: { id },
          data: {
            status: 'confirmed',
            adminNotes: data.adminNotes,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        // Update user total withdrawn
        const user = await tx.user.findUnique({ where: { id: investment.userId } });
        if (!user) throw new Error('User not found');

        const newTotalWithdrawn = d(user.totalWithdrawn) + d(investment.amount);
        await tx.user.update({
          where: { id: investment.userId },
          data: {
            totalWithdrawn: ds(newTotalWithdrawn),
          },
        });

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
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque aprovado com sucesso' });
    }

    if (data.action === 'complete') {
      // Complete action: only accept 'confirmed' (approved) status — prevents bypassing approval step
      const result = await db.$transaction(async (tx) => {
        const investment = await tx.investment.findUnique({ where: { id } });
        if (!investment) throw new Error('Saque não encontrado');
        if (investment.status !== 'confirmed') throw new Error('Withdrawal must be approved before completion');

        const updated = await tx.investment.update({
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
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque completado com sucesso' });
    }

    if (data.action === 'reject') {
      // Status check inside transaction to prevent race conditions
      const result = await db.$transaction(async (tx) => {
        const investment = await tx.investment.findUnique({ where: { id } });
        if (!investment) throw new Error('Saque não encontrado');
        if (investment.status === 'confirmed') throw new Error('Saque já foi confirmado');
        if (investment.status === 'rejected') throw new Error('Saque já foi rejeitado');

        // Refund user balance
        const user = await tx.user.findUnique({ where: { id: investment.userId } });
        if (!user) throw new Error('User not found');

        const newBalance = d(user.balance) + d(investment.amount);
        await tx.user.update({
          where: { id: investment.userId },
          data: {
            balance: ds(newBalance),
          },
        });

        // Create refund transaction
        await tx.transaction.create({
          data: {
            userId: investment.userId,
            type: 'admin_adjust',
            amount: investment.amount,
            status: 'completed',
            description: `Reembolso de saque rejeitado: ${dusdt(investment.amount)} USDT`,
            referenceId: investment.id,
            referenceType: 'Investment',
          },
        });

        // Update investment
        const updated = await tx.investment.update({
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
        },
      });

      return apiSuccess({ withdrawal: result, message: 'Saque rejeitado e valor reembolsado' });
    }

    return apiError('Ação inválida');
  } catch (error) {
    return handleApiError(error);
  }
}
