import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError, getIpFromRequest } from '@/lib/api-utils';

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
    const { name, avatar, specialty, winRate, totalPnl, monthlyRoi, riskLevel, isActive, isFeatured, sortOrder } = body;

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
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
      },
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId,
        action: 'create',
        entity: 'copy_trader',
        entityId: trader.id,
        newValue: JSON.stringify(body),
        description: `Copy trader criado: ${trader.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ trader }, 'Copy trader criado com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const body = await request.json();
    const { id, name, avatar, specialty, winRate, totalPnl, monthlyRoi, riskLevel, isActive, isFeatured, sortOrder } = body;

    if (!id) return apiError('ID é obrigatório para atualização', 400);

    const existing = await db.copyTrader.findUnique({ where: { id } });
    if (!existing) return apiError('Copy trader não encontrado', 404);

    const trader = await db.copyTrader.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar: avatar || null }),
        ...(specialty !== undefined && { specialty }),
        ...(winRate !== undefined && { winRate }),
        ...(totalPnl !== undefined && { totalPnl }),
        ...(monthlyRoi !== undefined && { monthlyRoi }),
        ...(riskLevel !== undefined && { riskLevel }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId,
        action: 'update',
        entity: 'copy_trader',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(body),
        description: `Copy trader atualizado: ${trader.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ trader }, 'Copy trader atualizado com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) return apiError('Não autorizado', 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return apiError('ID é obrigatório para exclusão', 400);

    const existing = await db.copyTrader.findUnique({ where: { id } });
    if (!existing) return apiError('Copy trader não encontrado', 404);

    await db.copyTrader.delete({ where: { id } });

    // Audit log
    await db.adminLog.create({
      data: {
        adminId,
        action: 'delete',
        entity: 'copy_trader',
        entityId: id,
        oldValue: JSON.stringify(existing),
        description: `Copy trader excluído: ${existing.name}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ id }, 'Copy trader excluído com sucesso');
  } catch (error) {
    return handleApiError(error);
  }
}
