import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin, getIpFromRequest, apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { verifyAdminPin } from '@/lib/admin-pin';
import { z } from 'zod/v4';

const updateInvitationSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  pin: z.string().min(1, 'PIN de segurança é obrigatório'),
});

// ============================================================================
// PUT /api/admin/invitations/[id] — Approve/reject/cancel invitation
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireSuperAdmin(request);
    if (!adminId) return apiError('Acesso negado', 403);

    const { id } = await params;
    const body = await request.json();
    const data = updateInvitationSchema.parse(body);

    // Verify PIN
    const pinValid = await verifyAdminPin(adminId, data.pin);
    if (!pinValid) {
      return apiError('PIN de segurança inválido', 403);
    }

    const invitation = await db.adminInvitation.findUnique({ where: { id } });
    if (!invitation) {
      return apiError('Convite não encontrado', 404);
    }

    // Only pending invitations can be approved/rejected/cancelled
    if (invitation.status !== 'pending') {
      return apiError(`Convite não pode ser alterado — status atual: ${invitation.status}`);
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      await db.adminInvitation.update({
        where: { id },
        data: { status: 'expired' },
      });
      return apiError('Este convite já expirou');
    }

    let newStatus: string;
    let actionDescription: string;

    switch (data.action) {
      case 'approve':
        newStatus = 'approved';
        actionDescription = 'aprovado';
        break;
      case 'reject':
        newStatus = 'rejected';
        actionDescription = 'rejeitado';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        actionDescription = 'cancelado';
        break;
    }

    const updated = await db.adminInvitation.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: data.action === 'approve' ? adminId : undefined,
        approvedAt: data.action === 'approve' ? new Date() : undefined,
      },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    // Log to AdminLog
    await db.adminLog.create({
      data: {
        adminId,
        action: data.action === 'approve' ? 'approve' : data.action === 'reject' ? 'reject' : 'update',
        entity: 'admin_invitation',
        entityId: id,
        oldValue: JSON.stringify({ status: invitation.status }),
        newValue: JSON.stringify({ status: newStatus }),
        description: `Convite para ${invitation.name} (${invitation.email}) ${actionDescription}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ invitation: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/admin/invitations/[id] — Delete invitation (super_admin only)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireSuperAdmin(request);
    if (!adminId) return apiError('Acesso negado', 403);

    const { id } = await params;

    const invitation = await db.adminInvitation.findUnique({ where: { id } });
    if (!invitation) {
      return apiError('Convite não encontrado', 404);
    }

    await db.adminInvitation.delete({ where: { id } });

    // Log to AdminLog
    await db.adminLog.create({
      data: {
        adminId,
        action: 'delete',
        entity: 'admin_invitation',
        entityId: id,
        oldValue: JSON.stringify(invitation),
        description: `Convite deletado: ${invitation.name} (${invitation.email})`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: 'Convite deletado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
