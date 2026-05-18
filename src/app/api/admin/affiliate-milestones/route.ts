import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// Default milestone seeds
const DEFAULT_MILESTONES = [
  {
    name: 'Primeira Indicação',
    description: 'Faça sua primeira indicação e ganhe $5',
    targetCount: 1,
    rewardType: 'cash',
    rewardValue: '5',
    icon: '🎯',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: '5 Indicações',
    description: 'Alcance 5 indicações e ganhe $25',
    targetCount: 5,
    rewardType: 'cash',
    rewardValue: '25',
    icon: '⭐',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: '15 Indicações',
    description: 'Alcance 15 indicações e ganhe $75',
    targetCount: 15,
    rewardType: 'cash',
    rewardValue: '75',
    icon: '🚀',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: '50 Indicações',
    description: 'Alcance 50 indicações e ganhe $200',
    targetCount: 50,
    rewardType: 'cash',
    rewardValue: '200',
    icon: '🏆',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: '100 Indicações',
    description: 'Alcance 100 indicações e ganhe $500',
    targetCount: 100,
    rewardType: 'cash',
    rewardValue: '500',
    icon: '👑',
    sortOrder: 5,
    isActive: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Seed default milestones if none exist
    const existingCount = await db.affiliateMilestone.count();
    if (existingCount === 0) {
      await db.affiliateMilestone.createMany({ data: DEFAULT_MILESTONES });
    }

    const milestones = await db.affiliateMilestone.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { claims: true },
        },
      },
    });

    return apiSuccess({ milestones });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      name,
      description,
      targetCount,
      rewardType = 'cash',
      rewardValue = '0',
      icon = '🎯',
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!name) {
      return apiError('Nome do marco é obrigatório');
    }

    if (targetCount === undefined || targetCount === null) {
      return apiError('Quantidade alvo é obrigatória');
    }

    const milestone = await db.affiliateMilestone.create({
      data: {
        name,
        description: description || null,
        targetCount,
        rewardType,
        rewardValue,
        icon,
        sortOrder,
        isActive,
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'affiliate_milestone',
        entityId: milestone.id,
        newValue: JSON.stringify(body),
        description: `Marco de afiliado criado: ${milestone.name}`,
      },
    });

    return apiSuccess({ milestone }, 201);
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
      return apiError('ID do marco é obrigatório');
    }

    const existing = await db.affiliateMilestone.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Marco não encontrado', 404);
    }

    // Build update data object
    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description || null;
    if (updateData.targetCount !== undefined) data.targetCount = updateData.targetCount;
    if (updateData.rewardType !== undefined) data.rewardType = updateData.rewardType;
    if (updateData.rewardValue !== undefined) data.rewardValue = updateData.rewardValue;
    if (updateData.icon !== undefined) data.icon = updateData.icon;
    if (updateData.sortOrder !== undefined) data.sortOrder = updateData.sortOrder;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    const milestone = await db.affiliateMilestone.update({
      where: { id },
      data,
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'affiliate_milestone',
        entityId: milestone.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Marco de afiliado atualizado: ${milestone.name}`,
      },
    });

    return apiSuccess({ milestone });
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
      return apiError('ID do marco é obrigatório');
    }

    const existing = await db.affiliateMilestone.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Marco não encontrado', 404);
    }

    // Soft delete
    const milestone = await db.affiliateMilestone.update({
      where: { id },
      data: { isActive: false },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'affiliate_milestone',
        entityId: milestone.id,
        oldValue: JSON.stringify(existing),
        description: `Marco de afiliado desativado: ${milestone.name}`,
      },
    });

    return apiSuccess({ milestone });
  } catch (error) {
    return handleApiError(error);
  }
}
