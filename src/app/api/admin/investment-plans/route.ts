import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { adminPlanSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// GET /api/admin/investment-plans - Get all plans (including inactive)
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return apiError('Não autorizado', 401);
    }

    const plans = await db.investmentPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { investments: true } },
      },
    });

    return apiSuccess({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/investment-plans - Create new plan
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return apiError('Não autorizado', 401);
    }

    const body = await request.json();
    const { name, description, minAmount, maxAmount, dailyRoi, duration, isActive, sortOrder, icon, color } = body;

    if (!name || !minAmount || !dailyRoi || !duration) {
      return apiError('Nome, valor mínimo, ROI diário e duração são obrigatórios');
    }

    const plan = await db.investmentPlan.create({
      data: {
        name,
        description,
        minAmount: minAmount.toString(),
        maxAmount: maxAmount ? maxAmount.toString() : null,
        dailyRoi: dailyRoi.toString(),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
        icon,
        color,
      },
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId,
        action: 'create',
        entity: 'investment_plan',
        entityId: plan.id,
        newValue: JSON.stringify(body),
        description: `Plano de investimento criado: ${plan.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ plan }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
