import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const pools = await db.tradingPool.findMany({});
    return apiSuccess({ pools });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const body = await request.json();
    const { name, totalAum, dailyVolume, strategy, status } = body;

    if (!name) return apiError('Nome é obrigatório', 400);

    const pool = await db.tradingPool.create({
      data: {
        name,
        totalAum: totalAum || '0',
        dailyVolume: dailyVolume || '0',
        strategy: strategy || 'arbitrage',
        status: status || 'active',
      },
    });

    return apiSuccess({ pool }, 'Trading pool criado com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}
