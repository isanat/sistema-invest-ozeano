import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { adminDepositActionSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';
import { processCommissions } from '@/lib/affiliate';
import { BusinessError } from '@/lib/api-utils';

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

    const [deposits, total] = await Promise.all([
      db.deposit.findMany({
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
      db.deposit.count({ where }),
    ]);

    return apiSuccess({
      deposits: deposits,
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
        // Acquire row lock and re-check status to prevent race conditions (PostgreSQL only)
        if (isPostgres()) {
          const lockedDeposit = await tx.$queryRaw<Array<{id: string; status: string}>>`SELECT id, status FROM "Deposit" WHERE id = ${id} FOR UPDATE`;
          if (lockedDeposit.length === 0) throw new Error('Depósito não encontrado');
          if (lockedDeposit[0].status !== 'pending') throw new Error('Depósito já foi processado');
        } else {
          // SQLite: re-read without FOR UPDATE
          const freshDeposit = await tx.deposit.findUnique({ where: { id } });
          if (!freshDeposit) throw new Error('Depósito não encontrado');
          if (freshDeposit.status !== 'pending') throw new Error('Depósito já foi processado');
        }

        const deposit = await tx.deposit.findUnique({ where: { id } });
        if (!deposit) throw new Error('Depósito não encontrado');

        // BLOCK: Prevent approving NowPayments-managed deposits
        const nowpaymentsDeposit = await tx.nowPaymentsDeposit.findFirst({
          where: { depositId: id },
        });
        if (nowpaymentsDeposit) {
          throw new BusinessError('Este depósito é gerenciado via NowPayments e só pode ser alterado pelo webhook.');
        }

        // Update deposit status
        const updated = await tx.deposit.update({
          where: { id },
          data: {
            status: 'confirmed',
            adminNotes: data.adminNotes,
            processedBy: session.userId,
            processedAt: new Date(),
          },
        });

        // Credit user balance atomically using raw SQL (PostgreSQL)
        // Only add to balance, NOT to totalInvested (totalInvested tracks plan investments, not deposits)
        // Also increment totalDeposited to track user's own deposits for withdrawal calculation
        // Set hasInvested = true so affiliate link-unlocking works consistently
        await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${d(deposit.amount)}) AS TEXT), "totalDeposited" = CAST((CAST("totalDeposited" AS NUMERIC) + ${d(deposit.amount)}) AS TEXT), "hasInvested" = true WHERE id = ${deposit.userId}`;

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'deposit',
            amount: deposit.amount,
            brlAmount: deposit.brlAmount,
            usdtRate: deposit.usdtRate,
            status: 'completed',
            description: `Depósito confirmado - ${deposit.method}${data.adminNotes ? ` (${data.adminNotes})` : ''}`,
            referenceId: deposit.id,
            referenceType: 'Deposit',
          },
        });

        return updated;
      });

      // Get deposit data for logging (outside transaction)
      const depositRecord = await db.deposit.findUnique({ where: { id } });

      // Process affiliate commissions on deposit
      try {
        if (depositRecord) await processCommissions(depositRecord.userId, d(depositRecord.amount), 'deposit', depositRecord.id);
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
          description: depositRecord ? `Depósito aprovado: ${dusdt(depositRecord.amount)} USDT para ${depositRecord.userId}` : 'Depósito aprovado',
        },
      });

      return apiSuccess({ deposit: result, message: 'Depósito aprovado com sucesso' });
    }

    if (data.action === 'reject') {
      const result = await db.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id } });
        if (!deposit) throw new Error('Depósito não encontrado');
        if (deposit.status !== 'pending') throw new Error('Depósito já foi processado');

        // BLOCK: Prevent rejecting NowPayments-managed deposits
        const nowpaymentsDeposit = await tx.nowPaymentsDeposit.findFirst({
          where: { depositId: id },
        });
        if (nowpaymentsDeposit) {
          throw new BusinessError('Este depósito é gerenciado via NowPayments e só pode ser alterado pelo webhook.');
        }

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
