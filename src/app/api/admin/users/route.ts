import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, ds, dusdt } from '@/lib/auth';
import { adminUserUpdateSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { affiliateCode: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          balance: true,
          affiliateBalance: true,
          totalRoi: true,
          totalInvested: true,
          totalDeposited: true,
          totalWithdrawn: true,
          affiliateCode: true,
          referredBy: true,
          hasInvested: true,
          linkUnlocked: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              referrals: true,
              investments: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return apiSuccess({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
      return apiError('ID do usuário é obrigatório');
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Usuário não encontrado', 404);
    }

    const data = adminUserUpdateSchema.parse(updateData);

    // Guard: admin cannot change their own role
    if (id === session.userId && data.role !== undefined && data.role !== 'admin') {
      return apiError('Você não pode alterar seu próprio papel');
    }

    // Guard: cannot demote the last admin
    if (data.role !== undefined && data.role !== 'admin') {
      const existing = await db.user.findUnique({ where: { id } });
      if (existing?.role === 'admin') {
        const adminCount = await db.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return apiError('Não é possível remover o último administrador do sistema');
        }
      }
    }

    // Use transaction with row lock for balance changes to create audit trail and prevent race conditions
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent modifications
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${id} FOR UPDATE`;
      }
      const lockedUser = await tx.user.findUnique({ where: { id } });
      if (!lockedUser) throw new Error('Usuário não encontrado');

      // Handle balance changes
      if (data.balance !== undefined && d(data.balance) !== d(lockedUser.balance)) {
        const diff = d(data.balance) - d(lockedUser.balance);
        await tx.transaction.create({
          data: {
            userId: id,
            type: 'admin_adjust',
            amount: ds(Math.abs(diff)),
            status: 'completed',
            description: `Ajuste admin no saldo: ${diff >= 0 ? '+' : ''}${dusdt(diff)} USDT`,
            referenceType: 'AdminAction',
          },
        });
      }

      if (data.affiliateBalance !== undefined && d(data.affiliateBalance) !== d(lockedUser.affiliateBalance)) {
        const diff = d(data.affiliateBalance) - d(lockedUser.affiliateBalance);
        await tx.transaction.create({
          data: {
            userId: id,
            type: 'admin_adjust',
            amount: ds(Math.abs(diff)),
            status: 'completed',
            description: `Ajuste admin no saldo afiliado: ${diff >= 0 ? '+' : ''}${dusdt(diff)} USDT`,
            referenceType: 'AdminAction',
          },
        });
      }

      // Update user
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.balance !== undefined && { balance: data.balance }),
          ...(data.affiliateBalance !== undefined && { affiliateBalance: data.affiliateBalance }),
          ...(data.totalInvested !== undefined && { totalInvested: data.totalInvested }),
          ...(data.totalRoi !== undefined && { totalRoi: data.totalRoi }),
          ...(data.totalDeposited !== undefined && { totalDeposited: data.totalDeposited }),
          ...(data.totalWithdrawn !== undefined && { totalWithdrawn: data.totalWithdrawn }),
          ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress || null }),
          ...(data.pixKey !== undefined && { pixKey: data.pixKey || null }),
          ...(data.linkUnlocked !== undefined && { linkUnlocked: data.linkUnlocked }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          balance: true,
          affiliateBalance: true,
          walletAddress: true,
          pixKey: true,
          linkUnlocked: true,
        },
      });

      return user;
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'user',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(data),
        description: `Usuário atualizado: ${existing.name} (${existing.email})`,
      },
    });

    return apiSuccess({ user: result });
  } catch (error) {
    return handleApiError(error);
  }
}
