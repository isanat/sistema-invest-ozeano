import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAdmin, d, ds, dusdt, hashPassword } from '@/lib/auth';
import { adminUserUpdateSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination, getClientIp } from '@/lib/api-utils';
import { verifyAdminPin, requiresPinVerification, getPinActionForUserUpdate } from '@/lib/admin-pin';
import { verifyPinForAction } from '@/lib/admin-pin-middleware';

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
          voucherBalance: true,
          totalRoi: true,
          totalInvested: true,
          totalDeposited: true,
          totalWithdrawn: true,
          totalAffiliateEarnings: true,
          teamBonusPct: true,
          referralLevel: true,
          affiliateCode: true,
          referredBy: true,
          hasInvested: true,
          linkUnlocked: true,
          walletAddress: true,
          pixKey: true,
          securityPinSetAt: true,
          createdAt: true,
          updatedAt: true,
          adminPin: { select: { id: true } },
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

    // Add hasPin flag to each user
    const usersWithPinStatus = users.map(user => ({
      ...user,
      hasPin: !!user.securityPinSetAt || !!user.adminPin,
      securityPinSetAt: undefined,
      adminPin: undefined,
    }));

    return apiSuccess({
      users: usersWithPinStatus,
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
    const { id, pin, ...updateData } = body;

    if (!id) {
      return apiError('ID do usuário é obrigatório');
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Usuário não encontrado', 404);
    }

    const data = adminUserUpdateSchema.parse(updateData);

    // Require PIN for sensitive fields (balance, role changes)
    if (requiresPinVerification(data, existing)) {
      // Try x-admin-pin header first (new middleware approach)
      const headerPin = request.headers.get('x-admin-pin');
      if (headerPin) {
        const pinAction = getPinActionForUserUpdate(data, existing) || 'balance_change';
        const pinResult = await verifyPinForAction(request, pinAction);
        if (!pinResult.success) {
          return apiError(pinResult.error!, 403);
        }
      } else if (pin) {
        // Fallback to body PIN (backward compatibility)
        const pinValid = await verifyAdminPin(session.userId, pin);
        if (!pinValid) {
          return apiError('PIN de segurança inválido', 403);
        }
      } else {
        return apiError('PIN de segurança é obrigatório para esta ação', 403);
      }
    }

    // Hash password if provided
    if (data.newPassword) {
      (data as any).hashedPassword = await hashPassword(data.newPassword);
      delete data.newPassword;
    }

    // Guard: admin cannot change their own role
    if (id === session.userId && data.role !== undefined && data.role !== 'admin' && data.role !== 'super_admin') {
      return apiError('Você não pode alterar seu próprio papel');
    }

    // Guard: cannot demote the last admin/super_admin
    if (data.role !== undefined && data.role !== 'admin' && data.role !== 'super_admin') {
      if (existing.role === 'admin' || existing.role === 'super_admin') {
        const adminCount = await db.user.count({ where: { role: { in: ['admin', 'super_admin'] } } });
        if (adminCount <= 1) {
          return apiError('Não é possível remover o último administrador do sistema');
        }
      }
    }

    const ipAddress = getClientIp(request);

    // Use transaction with row lock for balance changes to create audit trail and prevent race conditions
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent modifications
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${id} FOR UPDATE`;
      }
      const lockedUser = await tx.user.findUnique({ where: { id } });
      if (!lockedUser) throw new Error('Usuário não encontrado');

      // Create AdminLog first so we can use its ID as referenceId for Transaction records
      const adminLog = await tx.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'update',
          entity: 'user',
          entityId: id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(data),
          description: `Usuário atualizado: ${existing.name} (${existing.email})`,
          ipAddress,
        },
      });

      // Handle balance changes — link Transaction records to the AdminLog via referenceId
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
            referenceId: adminLog.id,
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
            referenceId: adminLog.id,
          },
        });
      }

      if (data.voucherBalance !== undefined && d(data.voucherBalance) !== d(lockedUser.voucherBalance)) {
        const diff = d(data.voucherBalance) - d(lockedUser.voucherBalance);
        await tx.transaction.create({
          data: {
            userId: id,
            type: 'admin_adjust',
            amount: ds(Math.abs(diff)),
            status: 'completed',
            description: `Ajuste admin no saldo voucher: ${diff >= 0 ? '+' : ''}${dusdt(diff)} USDT`,
            referenceType: 'AdminAction',
            referenceId: adminLog.id,
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
          ...(data.hasInvested !== undefined && { hasInvested: data.hasInvested }),
          ...(data.balance !== undefined && { balance: data.balance }),
          ...(data.affiliateBalance !== undefined && { affiliateBalance: data.affiliateBalance }),
          ...(data.voucherBalance !== undefined && { voucherBalance: data.voucherBalance }),
          ...(data.totalInvested !== undefined && { totalInvested: data.totalInvested }),
          ...(data.totalRoi !== undefined && { totalRoi: data.totalRoi }),
          ...(data.totalDeposited !== undefined && { totalDeposited: data.totalDeposited }),
          ...(data.totalWithdrawn !== undefined && { totalWithdrawn: data.totalWithdrawn }),
          ...(data.totalAffiliateEarnings !== undefined && { totalAffiliateEarnings: data.totalAffiliateEarnings }),
          ...(data.teamBonusPct !== undefined && { teamBonusPct: data.teamBonusPct }),
          ...(data.referralLevel !== undefined && { referralLevel: data.referralLevel }),
          ...(data.affiliateCode !== undefined && { affiliateCode: data.affiliateCode || null }),
          ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress || null }),
          ...(data.pixKey !== undefined && { pixKey: data.pixKey || null }),
          ...(data.linkUnlocked !== undefined && { linkUnlocked: data.linkUnlocked }),
          ...((data as any).hashedPassword && { password: (data as any).hashedPassword }),
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

    return apiSuccess({ user: result });
  } catch (error) {
    return handleApiError(error);
  }
}
