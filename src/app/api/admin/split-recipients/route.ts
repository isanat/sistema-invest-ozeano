import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, BusinessError, sanitizePagination } from '@/lib/api-utils';

// GET /api/admin/split-recipients — List all recipients + summary stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '50'
    );

    // Get all recipients (active + inactive)
    const [recipients, total] = await Promise.all([
      db.splitRecipient.findMany({
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        include: {
          _count: { select: { splitLogs: true } },
        },
      }),
      db.splitRecipient.count(),
    ]);

    // Summary stats
    const activeRecipients = recipients.filter((r) => r.isActive);
    const totalPctAllocated = activeRecipients.reduce((s, r) => s + d(r.percentage), 0);
    const totalAccumulated = activeRecipients.reduce((s, r) => s + d(r.accumulatedBalance), 0);
    const totalSent = recipients.reduce((s, r) => s + d(r.totalSent), 0);
    const activeCount = activeRecipients.length;

    // Recent split logs (last 50)
    const recentLogs = await db.splitLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        recipient: { select: { name: true, role: true } },
      },
    });

    return apiSuccess({
      recipients,
      summary: {
        activeCount,
        totalPctAllocated,
        totalAccumulated,
        totalSent,
        overAllocated: totalPctAllocated > 100,
      },
      recentLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/split-recipients — Create new recipient
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { name, role, walletAddress, currency, percentage, minPayout, autoPayout } = body;

    // Validate
    if (!name || !walletAddress) {
      throw new BusinessError('Nome e carteira são obrigatórios');
    }

    const pct = d(percentage);
    if (pct <= 0 || pct > 100) {
      throw new BusinessError('Percentual deve ser entre 0.01 e 100');
    }

    // Check total allocation won't exceed 100%
    const activeRecipients = await db.splitRecipient.findMany({
      where: { isActive: true },
      select: { percentage: true },
    });
    const currentTotal = activeRecipients.reduce((s, r) => s + d(r.percentage), 0);
    if (currentTotal + pct > 100) {
      throw new BusinessError(`Total alocado seria ${currentTotal + pct}% (excede 100%). Atual: ${currentTotal}%`);
    }

    const recipient = await db.splitRecipient.create({
      data: {
        name,
        role: role || 'partner',
        walletAddress,
        currency: currency || 'usdttrc20',
        percentage: ds(pct),
        minPayout: ds(d(minPayout) || 50),
        autoPayout: autoPayout !== false,
      },
    });

    // Admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'split_recipient',
        entityId: recipient.id,
        newValue: JSON.stringify(recipient),
        description: `Sócio de split criado: ${name} (${pct}%)`,
      },
    });

    return apiSuccess({ recipient, message: 'Sócio adicionado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/split-recipients — Update recipient
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, name, role, walletAddress, currency, percentage, minPayout, autoPayout, isActive } = body;

    if (!id) {
      throw new BusinessError('ID é obrigatório');
    }

    const existing = await db.splitRecipient.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessError('Sócio não encontrado');
    }

    // If activating or changing percentage, check total allocation
    const newPct = percentage !== undefined ? d(percentage) : d(existing.percentage);
    const willBeActive = isActive !== undefined ? isActive : existing.isActive;

    if (willBeActive && newPct !== d(existing.percentage)) {
      const otherRecipients = await db.splitRecipient.findMany({
        where: { isActive: true, id: { not: id } },
        select: { percentage: true },
      });
      const otherTotal = otherRecipients.reduce((s, r) => s + d(r.percentage), 0);
      if (otherTotal + newPct > 100) {
        throw new BusinessError(`Total alocado seria ${otherTotal + newPct}% (excede 100%)`);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
    if (currency !== undefined) updateData.currency = currency;
    if (percentage !== undefined) updateData.percentage = ds(d(percentage));
    if (minPayout !== undefined) updateData.minPayout = ds(d(minPayout));
    if (autoPayout !== undefined) updateData.autoPayout = autoPayout;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.splitRecipient.update({
      where: { id },
      data: updateData,
    });

    // Admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: isActive === false ? 'deactivate' : isActive === true ? 'activate' : 'update',
        entity: 'split_recipient',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        description: `Sócio ${isActive === false ? 'desativado' : isActive === true ? 'reativado' : 'atualizado'}: ${updated.name} (${updated.percentage}%)`,
      },
    });

    return apiSuccess({ recipient: updated, message: 'Sócio atualizado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/split-recipients — Hard delete (only if accumulated = 0)
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new BusinessError('ID é obrigatório');
    }

    const existing = await db.splitRecipient.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessError('Sócio não encontrado');
    }

    if (d(existing.accumulatedBalance) > 0) {
      throw new BusinessError('Não é possível remover sócio com saldo acumulado. Faça o payout primeiro.');
    }

    await db.splitRecipient.delete({ where: { id } });

    // Admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'split_recipient',
        entityId: id,
        oldValue: JSON.stringify(existing),
        description: `Sócio removido: ${existing.name}`,
      },
    });

    return apiSuccess({ message: 'Sócio removido com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
