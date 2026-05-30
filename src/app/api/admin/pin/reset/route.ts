import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin, apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { hashPin, validatePinFormat, verifyAdminPin } from '@/lib/admin-pin';
import { z } from 'zod/v4';

const resetPinSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  newPin: z.string().regex(/^\d{6}$/, 'PIN deve ter exatamente 6 dígitos'),
  pin: z.string().min(1, 'PIN de segurança é obrigatório'),
});

// POST /api/admin/pin/reset — Super admin resets another admin's PIN
// Requires super_admin auth + own PIN verification
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireSuperAdmin(request);
    if (!adminId) return apiError('Acesso negado', 403);

    const body = await request.json();
    const data = resetPinSchema.parse(body);

    // Verify the caller's PIN
    const pinValid = await verifyAdminPin(adminId, data.pin);
    if (!pinValid) {
      return apiError('PIN de segurança inválido', 403);
    }

    // Validate new PIN format
    const formatCheck = validatePinFormat(data.newPin);
    if (!formatCheck.valid) {
      return apiError(formatCheck.error!);
    }

    // Verify target user exists and is an admin
    const targetUser = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return apiError('Usuário não encontrado', 404);
    }

    if (targetUser.role !== 'admin' && targetUser.role !== 'super_admin') {
      return apiError('PIN só pode ser resetado para usuários admin');
    }

    const pinHash = await hashPin(data.newPin);

    // Update User.securityPin
    await db.user.update({
      where: { id: data.userId },
      data: {
        securityPin: pinHash,
        securityPinSetAt: new Date(),
      },
    });

    // Also update/create AdminPin table for backward compatibility
    await db.adminPin.upsert({
      where: { userId: data.userId },
      update: { pinHash, failedAttempts: 0, lockedUntil: null },
      create: { userId: data.userId, pinHash },
    });

    // Log the PIN reset action
    await db.adminLog.create({
      data: {
        adminId,
        action: 'reset_pin',
        entity: 'admin_pin',
        entityId: data.userId,
        description: `PIN de segurança resetado para ${targetUser.name} (${targetUser.email})`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: `PIN resetado com sucesso para ${targetUser.name}` });
  } catch (error) {
    return handleApiError(error);
  }
}
