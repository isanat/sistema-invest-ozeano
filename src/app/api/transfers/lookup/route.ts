// Lookup user by email for transfer verification (shows name before sending)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    if (!userId) throw new BusinessError('Não autorizado', 401);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email) {
      throw new BusinessError('E-mail é obrigatório');
    }

    // Check if transfers are enabled
    const configEnabled = await db.systemConfig.findUnique({
      where: { key: 'transfer_enabled' },
      select: { value: true },
    });
    if (!configEnabled || configEnabled.value !== 'true') {
      throw new BusinessError('Transferências estão desativadas');
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user) {
      return apiSuccess({ found: false, message: 'Usuário não encontrado' });
    }

    if (!user.isActive) {
      return apiSuccess({ found: false, message: 'Conta do destinatário está inativa' });
    }

    if (user.id === userId) {
      return apiSuccess({ found: false, message: 'Não é possível transferir para você mesmo' });
    }

    return apiSuccess({
      found: true,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
