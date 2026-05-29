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
    const { name, minDirectReferrals, commissionBoost, icon, color } = body;

    const existing = await db.affiliateRank.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Rank não encontrado', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (minDirectReferrals !== undefined) updateData.minDirectReferrals = parseInt(minDirectReferrals);
    if (commissionBoost !== undefined) updateData.commissionBoost = commissionBoost.toString();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;

    const rank = await db.affiliateRank.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'affiliate_rank',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Rank de afiliado atualizado: ${rank.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ rank });
  } catch (error) {
    return handleApiError(error);
  }
}
