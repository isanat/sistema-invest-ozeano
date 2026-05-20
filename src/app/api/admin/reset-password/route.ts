import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// Temporary endpoint to reset admin password - REMOVE after use
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return apiError('Nova senha deve ter no mínimo 6 caracteres');
    }

    // Find admin user
    const admin = await db.user.findFirst({
      where: { role: 'admin', ...(email ? { email } : {}) },
    });

    if (!admin) {
      return apiError('Nenhum usuário admin encontrado', 404);
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return apiSuccess({
      message: 'Senha do admin resetada com sucesso',
      email: admin.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
