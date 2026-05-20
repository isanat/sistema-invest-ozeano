import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const traders = await db.copyTrader.findMany({
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
    return apiSuccess({ traders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const body = await request.json();
    const { name, avatar, specialty, winRate, totalPnl, monthlyRoi, riskLevel, isFeatured, sortOrder } = body;

    if (!name) return apiError('Nome é obrigatório', 400);

    const trader = await db.copyTrader.create({
      data: {
        name,
        avatar: avatar || null,
        specialty: specialty || 'DeFi',
        winRate: winRate || '87',
        totalPnl: totalPnl || '0',
        monthlyRoi: monthlyRoi || '150',
        riskLevel: riskLevel || 'medium',
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
      },
    });

    return apiSuccess({ trader }, 'Copy trader criado com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}
