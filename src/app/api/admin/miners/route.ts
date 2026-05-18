import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { adminMinerSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const miners = await db.miner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { plans: { where: { isActive: true } }, rentals: true },
        },
      },
    });

    return apiSuccess({ miners });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const data = adminMinerSchema.parse(body);

    // Check unique name
    const existing = await db.miner.findUnique({ where: { name: data.name } });
    if (existing) {
      return apiError('Já existe uma mineradora com este nome', 409);
    }

    const miner = await db.miner.create({
      data: {
        name: data.name,
        model: data.model,
        hashRate: data.hashRate,
        powerConsumption: data.powerConsumption,
        coin: data.coin,
        pool: data.pool,
        dailyRevenue: data.dailyRevenue,
        pricePerDay: data.pricePerDay,
        minRentalDays: data.minRentalDays,
        maxRentalDays: data.maxRentalDays,
        profitSharePct: data.profitSharePct,
        efficiency: data.efficiency,
        description: data.description,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'miner',
        entityId: miner.id,
        newValue: JSON.stringify(data),
        description: `Mineradora criada: ${miner.name}`,
      },
    });

    return apiSuccess({ miner }, 201);
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
      return apiError('ID da mineradora é obrigatório');
    }

    const existing = await db.miner.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Mineradora não encontrada', 404);
    }

    const data = adminMinerSchema.parse(updateData);

    // Check unique name (excluding self)
    if (data.name !== existing.name) {
      const nameConflict = await db.miner.findUnique({ where: { name: data.name } });
      if (nameConflict) {
        return apiError('Já existe uma mineradora com este nome', 409);
      }
    }

    const miner = await db.miner.update({
      where: { id },
      data: {
        name: data.name,
        model: data.model,
        hashRate: data.hashRate,
        powerConsumption: data.powerConsumption,
        coin: data.coin,
        pool: data.pool,
        dailyRevenue: data.dailyRevenue,
        pricePerDay: data.pricePerDay,
        minRentalDays: data.minRentalDays,
        maxRentalDays: data.maxRentalDays,
        profitSharePct: data.profitSharePct,
        efficiency: data.efficiency,
        description: data.description,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
      },
    });

    // Recalculate related plans pricing
    const plans = await db.miningPlan.findMany({
      where: { minerId: id, isActive: true },
    });

    for (const plan of plans) {
      const pricePerDay = d(data.pricePerDay);
      const dailyRevenue = d(data.dailyRevenue);
      const profitShare = d(data.profitSharePct);
      const discount = d(plan.discountPct);

      const totalPrice = pricePerDay * plan.days * (1 - discount / 100);
      const dailyReturn = dailyRevenue * (profitShare / 100);
      const totalReturn = dailyReturn * plan.days;

      await db.miningPlan.update({
        where: { id: plan.id },
        data: {
          totalPrice: ds(totalPrice),
          dailyReturn: ds(dailyReturn),
          totalReturn: ds(totalReturn),
        },
      });
    }

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'miner',
        entityId: miner.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(data),
        description: `Mineradora atualizada: ${miner.name}`,
      },
    });

    return apiSuccess({ miner });
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
      return apiError('ID da mineradora é obrigatório');
    }

    const existing = await db.miner.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Mineradora não encontrada', 404);
    }

    // Soft delete
    const miner = await db.miner.update({
      where: { id },
      data: { isActive: false },
    });

    // Also deactivate plans
    await db.miningPlan.updateMany({
      where: { minerId: id },
      data: { isActive: false },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'miner',
        entityId: miner.id,
        oldValue: JSON.stringify(existing),
        description: `Mineradora desativada: ${miner.name}`,
      },
    });

    return apiSuccess({ miner });
  } catch (error) {
    return handleApiError(error);
  }
}
