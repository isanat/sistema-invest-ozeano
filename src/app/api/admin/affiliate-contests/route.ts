import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const contests = await db.affiliateContest.findMany({
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
    });

    return apiSuccess({ contests });
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
      startDate,
      endDate,
      rewardPool = '0',
      metric = 'referrals',
      isActive = true,
      isFeatured = false,
    } = body;

    if (!name) {
      return apiError('Nome do concurso é obrigatório');
    }

    if (!startDate || !endDate) {
      return apiError('Data de início e fim são obrigatórias');
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return apiError('Data de fim deve ser posterior à data de início');
    }

    const contest = await db.affiliateContest.create({
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rewardPool,
        metric,
        isActive,
        isFeatured,
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'affiliate_contest',
        entityId: contest.id,
        newValue: JSON.stringify(body),
        description: `Concurso de afiliado criado: ${contest.name}`,
      },
    });

    return apiSuccess({ contest }, 201);
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
      return apiError('ID do concurso é obrigatório');
    }

    const existing = await db.affiliateContest.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Concurso não encontrado', 404);
    }

    // Validate date range if both are being updated
    const newStartDate = updateData.startDate ? new Date(updateData.startDate) : existing.startDate;
    const newEndDate = updateData.endDate ? new Date(updateData.endDate) : existing.endDate;

    if (newEndDate <= newStartDate) {
      return apiError('Data de fim deve ser posterior à data de início');
    }

    // Build update data object
    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description || null;
    if (updateData.startDate !== undefined) data.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined) data.endDate = new Date(updateData.endDate);
    if (updateData.rewardPool !== undefined) data.rewardPool = updateData.rewardPool;
    if (updateData.metric !== undefined) data.metric = updateData.metric;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
    if (updateData.isFeatured !== undefined) data.isFeatured = updateData.isFeatured;

    const contest = await db.affiliateContest.update({
      where: { id },
      data,
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'affiliate_contest',
        entityId: contest.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Concurso de afiliado atualizado: ${contest.name}`,
      },
    });

    return apiSuccess({ contest });
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
      return apiError('ID do concurso é obrigatório');
    }

    const existing = await db.affiliateContest.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Concurso não encontrado', 404);
    }

    // Soft delete
    const contest = await db.affiliateContest.update({
      where: { id },
      data: { isActive: false },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'affiliate_contest',
        entityId: contest.id,
        oldValue: JSON.stringify(existing),
        description: `Concurso de afiliado desativado: ${contest.name}`,
      },
    });

    return apiSuccess({ contest });
  } catch (error) {
    return handleApiError(error);
  }
}
