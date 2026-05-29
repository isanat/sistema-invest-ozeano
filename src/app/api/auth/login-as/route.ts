import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, setSessionCookie } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';

// POST /api/auth/login-as — Admin impersonates a user (no password required)
export async function POST(request: NextRequest) {
  try {
    // Verify the requester is an admin
    const adminSession = await requireAdmin();

    const body = await request.json();
    const { userId, pin } = body;

    if (!userId) {
      return apiError('userId é obrigatório', 400);
    }

    // Require PIN for impersonation
    if (!pin) {
      return apiError('PIN de segurança é obrigatório para esta ação', 403);
    }
    const pinValid = await verifyAdminPin(adminSession.userId, pin);
    if (!pinValid) {
      return apiError('PIN de segurança inválido', 403);
    }

    // Find the target user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    if (!user.isActive) {
      return apiError('Não é possível logar em uma conta desativada', 403);
    }

    console.log(`[AUTH] Admin ${adminSession.email} impersonating user ${user.email}`);

    // Create session as the target user
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    await setSessionCookie(payload);

    // Log this action
    await db.adminLog.create({
      data: {
        adminId: adminSession.userId,
        action: 'login_as',
        entity: 'user',
        entityId: user.id,
        description: `Admin ${adminSession.email} logou como usuário ${user.email}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return apiSuccess({ user: userWithoutPassword, impersonated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
