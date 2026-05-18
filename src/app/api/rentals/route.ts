import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { rentalSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { processCommissions } from '@/lib/affiliate';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const rentals = await db.miningRental.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        miner: {
          select: { id: true, name: true, model: true, coin: true, hashRate: true },
        },
        plan: {
          select: { id: true, name: true, days: true },
        },
      },
    });

    return apiSuccess({ rentals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = rentalSchema.parse(body);

    // Use transaction for atomicity with row lock
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent balance modifications
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;

      // Get user
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('User not found');

      // Get miner
      const miner = await tx.miner.findUnique({ where: { id: data.minerId } });
      if (!miner) throw new Error('Mineradora não encontrada');
      if (!miner.isActive) throw new Error('Mineradora não está disponível');

      // Validate rental days
      if (data.days < miner.minRentalDays || data.days > miner.maxRentalDays) {
        throw new Error(`Período de locação deve ser entre ${miner.minRentalDays} e ${miner.maxRentalDays} dias`);
      }

      let totalPrice: number;
      let dailyReturn: number;
      let totalReturn: number;
      let profitShare: number;
      let discount = 0;

      // If planId provided, use plan pricing
      if (data.planId) {
        const plan = await tx.miningPlan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new Error('Plano não encontrado');
        if (!plan.isActive) throw new Error('Plano não está disponível');
        if (plan.minerId !== data.minerId) throw new Error('Plano não pertence a esta mineradora');

        totalPrice = d(plan.totalPrice);
        dailyReturn = d(plan.dailyReturn);
        totalReturn = d(plan.totalReturn);
        discount = d(plan.discountPct);
      } else {
        // Calculate custom pricing
        const pricePerDay = d(miner.pricePerDay);
        const dailyRevenue = d(miner.dailyRevenue);
        profitShare = d(miner.profitSharePct);

        totalPrice = pricePerDay * data.days;
        dailyReturn = dailyRevenue * (profitShare / 100);
        totalReturn = dailyReturn * data.days;
      }

      profitShare = d(miner.profitSharePct);

      // Validate balance
      const currentBalance = d(user.balance);
      if (currentBalance < totalPrice) {
        throw new Error(`Saldo insuficiente. Necessário: ${dusdt(totalPrice)} USDT, Disponível: ${dusdt(currentBalance)} USDT`);
      }

      // Deduct balance atomically (PostgreSQL)
      await tx.$executeRaw`UPDATE "User" SET balance = (CAST(balance AS NUMERIC) - ${totalPrice})::text, "totalInvested" = (CAST("totalInvested" AS NUMERIC) + ${totalPrice})::text, "hasInvested" = true WHERE id = ${session.userId} AND CAST(balance AS NUMERIC) >= ${totalPrice}`;
      // Verify the deduction actually happened
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.balance) === currentBalance) {
        throw new Error(`Saldo insuficiente. Necessário: ${dusdt(totalPrice)} USDT`);
      }

      // Create rental
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + data.days);

      const rental = await tx.miningRental.create({
        data: {
          userId: session.userId,
          minerId: data.minerId,
          planId: data.planId || null,
          startDate,
          endDate,
          amount: ds(totalPrice),
          hashShare: '100',
          dailyReturn: ds(dailyReturn),
          totalReturn: ds(totalReturn),
          profitShare: ds(profitShare),
          status: 'active',
        },
        include: {
          miner: {
            select: { id: true, name: true, model: true, coin: true },
          },
          plan: {
            select: { id: true, name: true, days: true },
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'rental_payment',
          amount: ds(totalPrice),
          status: 'completed',
          description: `Locação ${rental.miner.name} - ${data.days} dias${discount > 0 ? ` (${discount}% desconto)` : ''}`,
          referenceId: rental.id,
          referenceType: 'MiningRental',
        },
      });

      return { rental, totalPrice, dailyReturn, totalReturn };
    });

    // Process affiliate commissions (outside transaction to avoid long locks)
    try {
      await processCommissions(session.userId, result.totalPrice, 'rental', result.rental.id);
    } catch (commError) {
      // Don't fail the rental if commission processing fails
      console.error('Affiliate commission error:', commError);
    }

    return apiSuccess({
      rental: result.rental,
      pricing: {
        totalPrice: dusdt(result.totalPrice),
        dailyReturn: dusdt(result.dailyReturn),
        totalReturn: dusdt(result.totalReturn),
      },
      message: 'Locação criada com sucesso!',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
