import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError('Senha atual e nova senha são obrigatórias');
    }

    if (newPassword.length < 6) {
      return apiError('Nova senha deve ter no mínimo 6 caracteres');
    }

    if (currentPassword === newPassword) {
      return apiError('A nova senha deve ser diferente da atual');
    }

    // Get user with password
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return apiError('Senha atual incorreta');
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    // Log for admin
    if (session.role === 'admin' || session.role === 'super_admin') {
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: 'update',
          entity: 'user',
          entityId: session.userId,
          description: 'Senha alterada pelo próprio usuário',
          ipAddress: getIpFromRequest(request),
        },
      });
    }

    return apiSuccess({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
