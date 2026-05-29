import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, totalAum, dailyVolume, strategy, status, dailyRoi, weeklyRoi, monthlyRoi } = body;

    const existing = await db.tradingPool.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Trading pool não encontrado', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (totalAum !== undefined) updateData.totalAum = totalAum.toString();
    if (dailyVolume !== undefined) updateData.dailyVolume = dailyVolume.toString();
    if (strategy !== undefined) updateData.strategy = strategy;
    if (status !== undefined) updateData.status = status;
    if (dailyRoi !== undefined) updateData.dailyRoi = dailyRoi.toString();
    if (weeklyRoi !== undefined) updateData.weeklyRoi = weeklyRoi.toString();
    if (monthlyRoi !== undefined) updateData.monthlyRoi = monthlyRoi.toString();

    const pool = await db.tradingPool.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'trading_pool',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Trading pool atualizado: ${pool.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ pool });
  } catch (error) {
    return handleApiError(error);
  }
}
