import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { adminDepositActionSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';
import { processCommissions } from '@/lib/affiliate';

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

    const where: any = { type: 'deposit' };

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
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.investment.count({ where }),
    ]);

    return apiSuccess({
      deposits: investments,
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
      return apiError('ID do depósito é obrigatório');
    }

    const data = adminDepositActionSchema.parse(actionData);

    if (data.action === 'approve') {
      // Use transaction for atomicity — status check inside to prevent race conditions
      const result = await db.$transaction(async (tx) => {
        const investment = await tx.investment.findUnique({ where: { id } });
        if (!investment) throw new Error('Depósito não encontrado');
        if (investment.status !== 'pending') throw new Error('Depósito já foi processado');

        // Update investment status
        const updated = await tx.investment.update({
          where: { id },
          data: {
            status: 'confirmed',
            adminNotes: data.adminNotes,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        // Credit user balance atomically using raw SQL (SQLite-compatible)
        await tx.$executeRaw`UPDATE "User" SET balance = CAST(CAST(balance AS REAL) + ${d(investment.amount)} AS TEXT), "totalInvested" = CAST(CAST("totalInvested" AS REAL) + ${d(investment.amount)} AS TEXT) WHERE id = ${investment.userId}`;

        await tx.user.update({
          where: { id: investment.userId },
          data: {
            hasInvested: true,
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: investment.userId,
            type: 'deposit',
            amount: investment.amount,
            brlAmount: investment.brlAmount,
            usdtRate: investment.usdtRate,
            status: 'completed',
            description: `Depósito confirmado - ${investment.method}${data.adminNotes ? ` (${data.adminNotes})` : ''}`,
            referenceId: investment.id,
            referenceType: 'Investment',
          },
        });

        return updated;
      });

      // Get investment data for logging (outside transaction)
      const investment = await db.investment.findUnique({ where: { id } });

      // Process affiliate commissions on deposit
      try {
        if (investment) await processCommissions(investment.userId, d(investment.amount), 'deposit', investment.id);
      } catch (commErr) {
        console.error('Deposit commission error:', commErr);
      }

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'approve',
          entity: 'deposit',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status: 'confirmed' }),
          description: investment ? `Depósito aprovado: ${dusdt(investment.amount)} USDT para ${investment.userId}` : 'Depósito aprovado',
        },
      });

      return apiSuccess({ deposit: result, message: 'Depósito aprovado com sucesso' });
    }

    if (data.action === 'reject') {
      const result = await db.$transaction(async (tx) => {
        const investment = await tx.investment.findUnique({ where: { id } });
        if (!investment) throw new Error('Depósito não encontrado');
        if (investment.status !== 'pending') throw new Error('Depósito já foi processado');

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
          entity: 'deposit',
          entityId: id,
          oldValue: JSON.stringify({ status: 'pending' }),
          newValue: JSON.stringify({ status: 'rejected' }),
          description: 'Depósito rejeitado',
        },
      });

      return apiSuccess({ deposit: result, message: 'Depósito rejeitado' });
    }

    return apiError('Ação inválida');
  } catch (error) {
    return handleApiError(error);
  }
}
