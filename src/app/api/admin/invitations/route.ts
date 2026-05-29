import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { requireSuperAdmin, getIpFromRequest, apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';
import { z } from 'zod/v4';

const createInvitationSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.enum(['admin', 'super_admin']).default('admin'),
  pin: z.string().min(1, 'PIN de segurança é obrigatório'),
});

// ============================================================================
// GET /api/admin/invitations — List all invitations (super_admin only)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireSuperAdmin(request);
    if (!adminId) return apiError('Acesso negado', 403);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '50'
    );
    const statusFilter = searchParams.get('status') || '';

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    const [invitations, total] = await Promise.all([
      db.adminInvitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inviter: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
        },
      }),
      db.adminInvitation.count({ where }),
    ]);

    return apiSuccess({
      invitations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/admin/invitations — Create new invitation (super_admin only)
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireSuperAdmin(request);
    if (!adminId) return apiError('Acesso negado', 403);

    const body = await request.json();
    const data = createInvitationSchema.parse(body);

    // Verify PIN
    const pinValid = await verifyAdminPin(adminId, data.pin);
    if (!pinValid) {
      return apiError('PIN de segurança inválido', 403);
    }

    // Check if email is already registered as a user
    const existingUser = await db.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return apiError('Este email já está registrado como usuário');
    }

    // Check if there's already a pending/approved invitation for this email
    const existingInvitation = await db.adminInvitation.findFirst({
      where: {
        email: data.email,
        status: { in: ['pending', 'approved'] },
      },
    });
    if (existingInvitation) {
      return apiError('Já existe um convite ativo para este email');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Set 48h expiry
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invitation = await db.adminInvitation.create({
      data: {
        email: data.email,
        name: data.name,
        token,
        invitedBy: adminId,
        role: data.role,
        status: 'pending',
        expiresAt,
      },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    // Log to AdminLog
    await db.adminLog.create({
      data: {
        adminId,
        action: 'create',
        entity: 'admin_invitation',
        entityId: invitation.id,
        newValue: JSON.stringify({ email: data.email, name: data.name, role: data.role }),
        description: `Convite criado para ${data.name} (${data.email}) como ${data.role}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ invitation }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
