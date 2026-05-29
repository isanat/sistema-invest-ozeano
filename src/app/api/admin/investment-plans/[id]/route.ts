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
    const { name, description, minAmount, maxAmount, dailyRoi, duration, isActive, sortOrder, icon, color } = body;

    const existing = await db.investmentPlan.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Plano não encontrado', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (minAmount !== undefined) updateData.minAmount = minAmount.toString();
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? maxAmount.toString() : null;
    if (dailyRoi !== undefined) updateData.dailyRoi = dailyRoi.toString();
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;

    const plan = await db.investmentPlan.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'investment_plan',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Plano de investimento atualizado: ${plan.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
