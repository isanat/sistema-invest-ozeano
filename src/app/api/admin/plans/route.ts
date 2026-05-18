import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { adminPlanSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

function calculatePlanPricing(miner: { pricePerDay: string; dailyRevenue: string; profitSharePct: string }, days: number, discountPct: string) {
  const pricePerDay = d(miner.pricePerDay);
  const dailyRevenue = d(miner.dailyRevenue);
  const profitShare = d(miner.profitSharePct);
  const discount = d(discountPct);

  const totalPrice = pricePerDay * days * (1 - discount / 100);
  const dailyReturn = dailyRevenue * (profitShare / 100);
  const totalReturn = dailyReturn * days;

  return {
    totalPrice: ds(totalPrice),
    dailyReturn: ds(dailyReturn),
    totalReturn: ds(totalReturn),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const plans = await db.miningPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        miner: {
          select: { id: true, name: true, model: true, coin: true, isActive: true },
        },
      },
    });

    return apiSuccess({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const data = adminPlanSchema.parse(body);

    // Check unique name
    const existing = await db.miningPlan.findUnique({ where: { name: data.name } });
    if (existing) {
      return apiError('Já existe um plano com este nome', 409);
    }

    // Get miner for pricing
    const miner = await db.miner.findUnique({ where: { id: data.minerId } });
    if (!miner) {
      return apiError('Mineradora não encontrada', 404);
    }

    // Calculate pricing
    const pricing = calculatePlanPricing(miner, data.days, data.discountPct);

    const plan = await db.miningPlan.create({
      data: {
        name: data.name,
        description: data.description,
        minerId: data.minerId,
        days: data.days,
        discountPct: data.discountPct,
        totalPrice: pricing.totalPrice,
        dailyReturn: pricing.dailyReturn,
        totalReturn: pricing.totalReturn,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
      },
      include: {
        miner: {
          select: { id: true, name: true, model: true, coin: true },
        },
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'plan',
        entityId: plan.id,
        newValue: JSON.stringify(data),
        description: `Plano criado: ${plan.name}`,
      },
    });

    return apiSuccess({ plan }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiError('ID do plano é obrigatório');
    }

    const existing = await db.miningPlan.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Plano não encontrado', 404);
    }

    const data = adminPlanSchema.parse(updateData);

    // Check unique name (excluding self)
    if (data.name !== existing.name) {
      const nameConflict = await db.miningPlan.findUnique({ where: { name: data.name } });
      if (nameConflict) {
        return apiError('Já existe um plano com este nome', 409);
      }
    }

    // Get miner for pricing recalculation
    const miner = await db.miner.findUnique({ where: { id: data.minerId } });
    if (!miner) {
      return apiError('Mineradora não encontrada', 404);
    }

    // Recalculate pricing
    const pricing = calculatePlanPricing(miner, data.days, data.discountPct);

    const plan = await db.miningPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        minerId: data.minerId,
        days: data.days,
        discountPct: data.discountPct,
        totalPrice: pricing.totalPrice,
        dailyReturn: pricing.dailyReturn,
        totalReturn: pricing.totalReturn,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
      },
      include: {
        miner: {
          select: { id: true, name: true, model: true, coin: true },
        },
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'plan',
        entityId: plan.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(data),
        description: `Plano atualizado: ${plan.name}`,
      },
    });

    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID do plano é obrigatório');
    }

    const existing = await db.miningPlan.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Plano não encontrado', 404);
    }

    // Soft delete
    const plan = await db.miningPlan.update({
      where: { id },
      data: { isActive: false },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'plan',
        entityId: plan.id,
        oldValue: JSON.stringify(existing),
        description: `Plano desativado: ${plan.name}`,
      },
    });

    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
