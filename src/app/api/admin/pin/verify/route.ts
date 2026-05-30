import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { verifyAdminPin, adminHasPin } from '@/lib/admin-pin';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import { db } from '@/lib/db';

// In-memory rate limiting for PIN verification
const verifyAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/admin/pin/verify — Verify admin PIN for sensitive actions
// Body: { pin: string, action?: string }
// Returns { valid: boolean, hasPin: boolean }
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { pin, action } = body;

    // Check if admin has a PIN set
    const hasPin = await adminHasPin(session.userId);

    if (!pin) {
      return apiSuccess({ valid: false, hasPin });
    }

    // Rate limiting
    const attempts = verifyAttempts.get(session.userId);
    if (attempts && attempts.count >= MAX_VERIFY_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < VERIFY_LOCKOUT_MS) {
        const minutesLeft = Math.ceil((VERIFY_LOCKOUT_MS - timeSinceLastAttempt) / 60000);
        return apiError(`PIN bloqueado. Tente novamente em ${minutesLeft} minutos.`, 429);
      }
      verifyAttempts.delete(session.userId);
    }

    if (!hasPin) {
      return apiSuccess({ valid: false, hasPin: false });
    }

    const verified = await verifyAdminPin(session.userId, pin);

    // Track attempts
    if (!verified) {
      const current = verifyAttempts.get(session.userId) || { count: 0, lastAttempt: 0 };
      current.count += 1;
      current.lastAttempt = Date.now();
      verifyAttempts.set(session.userId, current);
    } else {
      verifyAttempts.delete(session.userId);
    }

    // Log the verification attempt
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: verified ? 'verify_pin' : 'verify_pin_failed',
        entity: 'admin_pin',
        description: verified
          ? `PIN verificado com sucesso${action ? ` para ação: ${action}` : ''}`
          : `Falha na verificação do PIN${action ? ` para ação: ${action}` : ''}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    if (!verified) {
      const currentAttempts = verifyAttempts.get(session.userId);
      const attemptsLeft = currentAttempts ? MAX_VERIFY_ATTEMPTS - currentAttempts.count : MAX_VERIFY_ATTEMPTS - 1;
      return apiSuccess({ valid: false, hasPin: true, attemptsLeft: Math.max(0, attemptsLeft) });
    }

    return apiSuccess({ valid: true, hasPin: true });
  } catch (error) {
    return handleApiError(error);
  }
}
