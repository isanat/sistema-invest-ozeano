import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// GET: List all badges
export async function GET() {
  try {
    await requireAdmin();

    const badges = await db.affiliateBadge.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { awards: true } },
      },
    });

    return apiSuccess({ badges });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Create a new badge
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { name, description, icon, color, category, requirement, rewardType, rewardValue, isAuto, sortOrder, isActive } = body;

    if (!name || !icon || !requirement) {
      return apiError('Nome, ícone e requisito são obrigatórios');
    }

    // Validate requirement is valid JSON
    try {
      JSON.parse(requirement);
    } catch {
      return apiError('Requisito deve ser um JSON válido. Ex: {"type":"referrals","count":5}');
    }

    const badge = await db.affiliateBadge.create({
      data: {
        name,
        description: description || null,
        icon: icon || '🏅',
        color: color || '#CD7F32',
        category: category || 'general',
        requirement,
        rewardType: rewardType || 'none',
        rewardValue: rewardValue || '0',
        isAuto: isAuto !== false,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'affiliate_badge',
        entityId: badge.id,
        newValue: JSON.stringify(body),
        description: `Badge de afiliado criado: ${badge.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ badge, message: 'Badge criado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Update a badge
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return apiError('ID do badge é obrigatório');
    }

    const existing = await db.affiliateBadge.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Badge não encontrado', 404);
    }

    // Validate requirement if provided
    if (updates.requirement) {
      try {
        JSON.parse(updates.requirement);
      } catch {
        return apiError('Requisito deve ser um JSON válido');
      }
    }

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.icon !== undefined) data.icon = updates.icon;
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.requirement !== undefined) data.requirement = updates.requirement;
    if (updates.rewardType !== undefined) data.rewardType = updates.rewardType;
    if (updates.rewardValue !== undefined) data.rewardValue = updates.rewardValue;
    if (updates.isAuto !== undefined) data.isAuto = updates.isAuto;
    if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;

    const badge = await db.affiliateBadge.update({
      where: { id },
      data,
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'affiliate_badge',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updates),
        description: `Badge de afiliado atualizado: ${badge.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ badge, message: 'Badge atualizado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Delete a badge (soft delete by setting isActive=false)
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID do badge é obrigatório');
    }

    const existing = await db.affiliateBadge.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Badge não encontrado', 404);
    }

    await db.affiliateBadge.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'affiliate_badge',
        entityId: id,
        oldValue: JSON.stringify(existing),
        description: `Badge de afiliado desativado: ${existing.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: 'Badge desativado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}
