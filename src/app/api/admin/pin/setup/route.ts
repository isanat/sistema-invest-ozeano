import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { hashPin, validatePinFormat, verifyAdminPin } from '@/lib/admin-pin';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// POST /api/admin/pin/setup — Create or update admin PIN
// Body: { currentPin?: string, newPin: string, confirmPin: string }
// - If admin has no PIN yet: just requires newPin + confirmPin
// - If admin has a PIN: requires currentPin + newPin + confirmPin
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { currentPin, newPin, confirmPin } = body;

    if (!newPin || !confirmPin) {
      return apiError('Novo PIN e confirmação são obrigatórios');
    }

    // Validate new PIN format with enhanced checks
    const formatCheck = validatePinFormat(newPin);
    if (!formatCheck.valid) {
      return apiError(formatCheck.error!);
    }

    if (newPin !== confirmPin) {
      return apiError('PIN e confirmação não conferem');
    }

    // Check if admin already has a PIN set
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { securityPin: true, adminPin: { select: { id: true } } },
    });

    const hasExistingPin = !!(user?.securityPin || user?.adminPin);

    // If admin has an existing PIN, require currentPin verification
    if (hasExistingPin) {
      if (!currentPin) {
        return apiError('PIN atual é obrigatório para alterar o PIN');
      }
      const currentPinValid = await verifyAdminPin(session.userId, currentPin);
      if (!currentPinValid) {
        return apiError('PIN atual incorreto', 403);
      }
    }

    const pinHash = await hashPin(newPin);

    // Update User.securityPin directly
    await db.user.update({
      where: { id: session.userId },
      data: {
        securityPin: pinHash,
        securityPinSetAt: new Date(),
      },
    });

    // Also update/create AdminPin table for backward compatibility
    await db.adminPin.upsert({
      where: { userId: session.userId },
      update: { pinHash },
      create: { userId: session.userId, pinHash },
    });

    // Log the PIN setup action
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'admin_pin',
        description: hasExistingPin
          ? 'PIN de segurança alterado'
          : 'PIN de segurança configurado pela primeira vez',
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ message: hasExistingPin ? 'PIN alterado com sucesso' : 'PIN configurado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
