import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import { hashPin } from '@/lib/admin-pin';
import { z } from 'zod/v4';

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  pin: z.string().regex(/^\d{6}$/, 'PIN deve ter exatamente 6 dígitos'),
});

// ============================================================================
// GET /api/admin/invitations/accept?token=XXX — Validate invitation token (PUBLIC)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return apiError('Token é obrigatório');
    }

    const invitation = await db.adminInvitation.findUnique({
      where: { token },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    if (!invitation) {
      return apiError('Convite não encontrado', 404);
    }

    // Check status
    if (invitation.status === 'used') {
      return apiError('Este convite já foi utilizado');
    }
    if (invitation.status === 'rejected') {
      return apiError('Este convite foi rejeitado');
    }
    if (invitation.status === 'cancelled') {
      return apiError('Este convite foi cancelado');
    }
    if (invitation.status === 'expired') {
      return apiError('Este convite expirou');
    }
    if (invitation.status !== 'approved') {
      // Still pending or other status
      return apiError('Este convite ainda não foi aprovado pelo super administrador');
    }

    // Check expiration
    if (invitation.expiresAt < new Date()) {
      await db.adminInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return apiError('Este convite expirou');
    }

    // Check if email already registered
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      return apiError('Este email já está registrado');
    }

    return apiSuccess({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviterName: invitation.createdBy?.name || 'Administrador',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/admin/invitations/accept — Accept invitation and register (PUBLIC)
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = acceptInvitationSchema.parse(body);

    const invitation = await db.adminInvitation.findUnique({
      where: { token: data.token },
    });

    if (!invitation) {
      return apiError('Convite não encontrado', 404);
    }

    // Validate status
    if (invitation.status !== 'approved') {
      if (invitation.status === 'used') return apiError('Este convite já foi utilizado');
      if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
        await db.adminInvitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
        return apiError('Este convite expirou');
      }
      if (invitation.status === 'rejected') return apiError('Este convite foi rejeitado');
      if (invitation.status === 'cancelled') return apiError('Este convite foi cancelado');
      return apiError('Este convite ainda não foi aprovado');
    }

    // Check expiration
    if (invitation.expiresAt < new Date()) {
      await db.adminInvitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
      return apiError('Este convite expirou');
    }

    // Check if email already registered
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      return apiError('Este email já está registrado');
    }

    // Hash password and PIN
    const hashedPassword = await hashPassword(data.password);
    const hashedPin = await hashPin(data.pin);

    // Create user and update invitation in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create admin user
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          name: data.name,
          password: hashedPassword,
          role: invitation.role,
          isActive: true,
          hasInvested: false,
          linkUnlocked: false,
        },
      });

      // Create admin PIN
      await tx.adminPin.create({
        data: {
          userId: user.id,
          pinHash: hashedPin,
        },
      });

      // Mark invitation as used
      await tx.adminInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'used',
          acceptedAt: new Date(),
        },
      });

      // Log to AdminLog
      await tx.adminLog.create({
        data: {
          adminId: invitation.approvedBy || invitation.createdById,
          action: 'create',
          entity: 'user',
          entityId: user.id,
          newValue: JSON.stringify({ email: user.email, name: user.name, role: user.role, source: 'invitation' }),
          description: `Admin criado via convite: ${user.name} (${user.email}) como ${user.role}`,
          ipAddress: 'accept-invitation',
        },
      });

      return user;
    });

    return apiSuccess({
      message: 'Conta de administrador criada com sucesso',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
