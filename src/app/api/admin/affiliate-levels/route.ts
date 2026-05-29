import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { adminAffiliateLevelSchema } from '@/lib/validations';

// GET /api/admin/affiliate-levels - Get all 11 levels
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return apiError('Não autorizado', 401);
    }

    const levels = await db.affiliateLevel.findMany({
      orderBy: { level: 'asc' },
    });

    return apiSuccess({ levels });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/affiliate-levels - Update level percentages
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return apiError('Não autorizado', 401);
    }

    const body = await request.json();
    const { levels } = body;

    if (!levels || !Array.isArray(levels)) {
      return apiError('Array de níveis é obrigatório');
    }

    const ipAddress = getIpFromRequest(request);
    const updatedLevels = [];

    for (const levelData of levels) {
      const { level, percentage } = levelData;
      if (!level || percentage === undefined) continue;

      const existing = await db.affiliateLevel.findUnique({ where: { level } });

      const updated = await db.affiliateLevel.upsert({
        where: { level },
        update: { percentage: percentage.toString() },
        create: {
          level,
          percentage: percentage.toString(),
          description: `Level ${level}`,
        },
      });

      // Audit log
      await db.adminLog.create({
        data: {
          adminId,
          action: existing ? 'update' : 'create',
          entity: 'affiliate_level',
          entityId: updated.id,
          oldValue: existing ? JSON.stringify(existing) : undefined,
          newValue: JSON.stringify({ level, percentage }),
          description: `Nível afiliado ${level} ${existing ? 'atualizado' : 'criado'}: ${percentage}%`,
          ipAddress,
        },
      });

      updatedLevels.push(updated);
    }

    return apiSuccess({ levels: updatedLevels });
  } catch (error) {
    return handleApiError(error);
  }
}
