import { NextRequest } from 'next/server';
import { db, isPostgres } from '@/lib/db';
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
    const source = searchParams.get('source') || '';
    const planId = searchParams.get('planId') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: any = {};

    if (status) where.status = status;
    if (source) where.source = source;
    if (planId) where.planId = planId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { userId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
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
          plan: {
            select: { id: true, name: true, dailyRoiPct: true, durationDays: true },
          },
        },
      }),
      db.investment.count({ where }),
    ]);

    // Compute stats using groupBy (compatible with SQLite + PostgreSQL)
    const [activeCount, completedCount, cancelledCount] = await Promise.all([
      db.investment.count({ where: { status: 'active' } }),
      db.investment.count({ where: { status: 'completed' } }),
      db.investment.count({ where: { status: 'cancelled' } }),
    ]);

    // Manual sum for totalActiveAmount and totalAllAmount (aggregate._sum not available in SQLite)
    const activeInvestments = await db.investment.findMany({ where: { status: 'active' }, select: { amount: true } });
    const allInvestments = await db.investment.findMany({ select: { amount: true } });
    const totalActiveAmount = activeInvestments.reduce((sum, inv) => sum + d(inv.amount), 0);
    const totalAllAmount = allInvestments.reduce((sum, inv) => sum + d(inv.amount), 0);

    return apiSuccess({
      investments,
      stats: {
        activeCount,
        completedCount,
        cancelledCount,
        total: activeCount + completedCount + cancelledCount,
        totalActiveAmount: dusdt(totalActiveAmount),
        totalAllAmount: dusdt(totalAllAmount),
      },
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

// Cancel an active investment (admin action)
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, action, adminNotes } = body;

    if (!id) return apiError('ID do investimento é obrigatório');
    if (!action) return apiError('Ação é obrigatória');

    if (action === 'cancel') {
      const result = await db.$transaction(async (tx) => {
        // Lock the investment row for PostgreSQL to prevent concurrent modifications
        if (isPostgres()) {
          await tx.$queryRaw`SELECT 1 FROM "Investment" WHERE id = ${id} FOR UPDATE`;
        }

        const investment = await tx.investment.findUnique({ where: { id }, include: { user: true } });
        if (!investment) throw new Error('Investimento não encontrado');
        if (investment.status !== 'active') throw new Error('Apenas investimentos ativos podem ser cancelados');

        // Calculate total ROI already paid — must be deducted from refund
        // NOTE: Can't use _sum because 'totalRoi' is String, not numeric — sum in JS
        const roiPaidRecords = await tx.roiHistory.findMany({
          where: { investmentId: investment.id },
          select: { totalRoi: true },
        });
        const totalRoiPaid = roiPaidRecords.reduce((sum, r) => sum + d(r.totalRoi), 0);
        const investmentAmount = d(investment.amount);

        // Refund only the net principal (principal minus ROI already distributed)
        const refundAmount = Math.max(0, investmentAmount - totalRoiPaid);

        // Update investment status
        const updated = await tx.investment.update({
          where: { id },
          data: { status: 'cancelled', updatedAt: new Date() },
        });

        // FIX: Refund to the correct balance based on the investment source
        // If the investment was funded from voucher, refund to voucherBalance, not balance
        // This prevents users from converting non-withdrawable voucher funds into withdrawable balance
        if (refundAmount > 0) {
          if (investment.source === 'voucher') {
            await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = CAST((CAST("voucherBalance" AS NUMERIC) + ${refundAmount}) AS TEXT) WHERE id = ${investment.userId}`;
          } else {
            await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${refundAmount}) AS TEXT) WHERE id = ${investment.userId}`;
          }
        }

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: investment.userId,
            type: 'investment_cancel',
            amount: ds(refundAmount),
            status: 'completed',
            description: `Investimento cancelado pelo admin - Plano: ${investment.planId || 'Custom'}${adminNotes ? ` (${adminNotes})` : ''}. Principal: ${dusdt(investmentAmount)} USDT, ROI já pago: ${dusdt(totalRoiPaid)} USDT, Reembolso: ${dusdt(refundAmount)} USDT${investment.source === 'voucher' ? ' (para voucherBalance)' : ''}`,
            referenceId: investment.id,
            referenceType: 'Investment',
          },
        });

        return { updated, refundAmount, totalRoiPaid, investmentAmount, source: investment.source };
      });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'cancel',
          entity: 'investment',
          entityId: id,
          oldValue: JSON.stringify({ status: 'active' }),
          newValue: JSON.stringify({ status: 'cancelled', source: result.source }),
          description: `Investimento cancelado: ${dusdt(result.investmentAmount)} USDT (ROI pago: ${dusdt(result.totalRoiPaid)} USDT, reembolso: ${dusdt(result.refundAmount)} USDT${result.source === 'voucher' ? ' → voucherBalance' : ''})`,
        },
      });

      return apiSuccess({ investment: result.updated, message: `Investimento cancelado. Reembolso: ${dusdt(result.refundAmount)} USDT${result.source === 'voucher' ? ' (creditado em voucherBalance)' : ''} (ROI já pago: ${dusdt(result.totalRoiPaid)} USDT descontado)` });
    }

    return apiError('Ação inválida');
  } catch (error) {
    return handleApiError(error);
  }
}
