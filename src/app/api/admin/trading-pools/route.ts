import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const pools = await db.tradingPool.findMany({});
    return apiSuccess({ pools });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, totalAum, dailyVolume, strategy, status } = body;

    if (!name) return apiError('Nome é obrigatório', 400);

    const pool = await db.tradingPool.create({
      data: {
        name,
        totalAum: totalAum || '0',
        dailyVolume: dailyVolume || '0',
        strategy: strategy || 'arbitrage',
        status: status || 'active',
      },
    });

    return apiSuccess({ pool }, 'Trading pool criado com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return apiError('ID do trading pool é obrigatório');

    const existing = await db.tradingPool.findUnique({ where: { id } });
    if (!existing) return apiError('Trading pool não encontrado', 404);

    // Build safe update object
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.totalAum !== undefined) data.totalAum = updates.totalAum;
    if (updates.dailyVolume !== undefined) data.dailyVolume = updates.dailyVolume;
    if (updates.strategy !== undefined) data.strategy = updates.strategy;
    if (updates.status !== undefined) data.status = updates.status;

    const pool = await db.tradingPool.update({
      where: { id },
      data,
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'trading_pool',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(data),
        description: `Trading pool atualizado: ${pool.name}`,
      },
    });

    return apiSuccess({ pool });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return apiError('ID do trading pool é obrigatório');

    const existing = await db.tradingPool.findUnique({ where: { id } });
    if (!existing) return apiError('Trading pool não encontrado', 404);

    const pool = await db.tradingPool.update({
      where: { id },
      data: { status: 'inactive' },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'trading_pool',
        entityId: id,
        description: `Trading pool desativado: ${pool.name}`,
      },
    });

    return apiSuccess({ pool });
  } catch (error) {
    return handleApiError(error);
  }
}
