import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// ============================================================================
// ADMIN PASSWORD RESET — Secured via CRON_SECRET
// ============================================================================
// This endpoint allows resetting the admin password when locked out.
// It requires the CRON_SECRET as a Bearer token for authorization.
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization via CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}` || !CRON_SECRET) {
      return apiError('Não autorizado', 401);
    }

    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return apiError('Email e nova senha são obrigatórios');
    }

    if (newPassword.length < 6) {
      return apiError('Nova senha deve ter no mínimo 6 caracteres');
    }

    // Find user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    // Only allow resetting admin/super_admin passwords
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return apiError('Apenas contas de administrador podem ser resetadas', 403);
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log the action
    await db.adminLog.create({
      data: {
        adminId: user.id,
        action: 'password_reset',
        entity: 'user',
        entityId: user.id,
        description: `Senha do admin resetada via endpoint seguro para ${email}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    console.info(`[ADMIN-RESET] Password reset for ${email} (role: ${user.role})`);

    return apiSuccess({ 
      message: `Senha do admin ${email} resetada com sucesso`,
      email,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
