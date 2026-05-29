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
    const { name, avatar, specialty, winRate, totalPnl, monthlyRoi, riskLevel, strategy, isActive, isFeatured, sortOrder, followers, totalTrades } = body;

    const existing = await db.copyTrader.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Copy trader não encontrado', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (winRate !== undefined) updateData.winRate = winRate.toString();
    if (totalPnl !== undefined) updateData.totalPnl = totalPnl.toString();
    if (monthlyRoi !== undefined) updateData.monthlyRoi = monthlyRoi.toString();
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (strategy !== undefined) updateData.strategy = strategy;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (followers !== undefined) updateData.followers = followers;
    if (totalTrades !== undefined) updateData.totalTrades = totalTrades;

    const trader = await db.copyTrader.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'copy_trader',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Copy trader atualizado: ${trader.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ trader });
  } catch (error) {
    return handleApiError(error);
  }
}
