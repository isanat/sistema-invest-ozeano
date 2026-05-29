import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { adminPlanSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// GET /api/admin/plans — List all investment plans (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const plans = await db.investmentPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { investments: { where: { status: 'active' } } },
        },
      },
    });

    return apiSuccess({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/plans — Create new investment plan (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const data = adminPlanSchema.parse(body);

    // Check unique name
    const existing = await db.investmentPlan.findUnique({ where: { name: data.name } });
    if (existing) {
      return apiError('Já existe um plano com este nome', 409);
    }

    const plan = await db.investmentPlan.create({
      data: {
        name: data.name,
        description: data.description,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        dailyRoiPct: data.dailyRoiPct,
        durationDays: data.durationDays,
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
        entity: 'plan',
        entityId: plan.id,
        newValue: JSON.stringify(data),
        description: `Plano de investimento criado: ${plan.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ plan }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/plans — Update investment plan (admin)
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiError('ID do plano é obrigatório');
    }

    const existing = await db.investmentPlan.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Plano não encontrado', 404);
    }

    const data = adminPlanSchema.parse(updateData);

    // Check unique name (excluding self)
    if (data.name !== existing.name) {
      const nameConflict = await db.investmentPlan.findUnique({ where: { name: data.name } });
      if (nameConflict) {
        return apiError('Já existe um plano com este nome', 409);
      }
    }

    const plan = await db.investmentPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        dailyRoiPct: data.dailyRoiPct,
        durationDays: data.durationDays,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
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
        description: `Plano de investimento atualizado: ${plan.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/plans — Delete investment plan (admin)
// ?id=xxx — soft delete (set isActive=false)
// ?id=xxx&hard=true — hard delete (permanent, only if no investments)
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id) {
      return apiError('ID do plano é obrigatório');
    }

    const existing = await db.investmentPlan.findUnique({
      where: { id },
      include: { _count: { select: { investments: true } } },
    });
    if (!existing) {
      return apiError('Plano não encontrado', 404);
    }

    if (hardDelete) {
      // Hard delete: only allowed if plan has no investments
      if (existing._count.investments > 0) {
        return apiError('Não é possível excluir permanentemente um plano que possui investimentos. Desative-o.');
      }
      await db.investmentPlan.delete({ where: { id } });

      // Log
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'delete',
          entity: 'plan',
          entityId: id,
          oldValue: JSON.stringify(existing),
          description: `Plano de investimento excluído permanentemente: ${existing.name}`,
          ipAddress: getIpFromRequest(request),
        },
      });

      return apiSuccess({ deleted: true });
    }

    // Soft delete
    const plan = await db.investmentPlan.update({
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
        description: `Plano de investimento desativado: ${plan.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
