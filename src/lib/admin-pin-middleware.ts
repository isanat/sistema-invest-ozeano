import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPin, PinRequiredAction, PIN_REQUIRED_ACTIONS } from '@/lib/admin-pin';
import { apiError } from '@/lib/api-utils';

// Rate limiting for PIN attempts (in-memory, per admin)
const pinAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Verify the x-admin-pin header for sensitive admin actions.
 * 
 * This middleware:
 * 1. Verifies admin identity via requireAdmin
 * 2. Checks rate limiting (5 attempts, 15 min lockout)
 * 3. Reads PIN from x-admin-pin header
 * 4. Verifies PIN against User.securityPin (falls back to AdminPin table)
 * 5. Tracks failed attempts and clears on success
 * 
 * Usage in API routes:
 * ```ts
 * const pinResult = await verifyPinForAction(request, 'balance_change');
 * if (!pinResult.success) {
 *   return apiError(pinResult.error!, 403);
 * }
 * ```
 */
export async function verifyPinForAction(
  request: NextRequest,
  action: PinRequiredAction
): Promise<{ success: boolean; adminId: string; error?: string }> {
  // 1. Verify admin identity — extract from headers set by middleware
  const adminId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  
  if (!adminId || (userRole !== 'admin' && userRole !== 'super_admin')) {
    return { success: false, adminId: adminId || '', error: 'Acesso negado. Apenas administradores podem realizar esta ação.' };
  }

  // 2. Check rate limiting
  const attempts = pinAttempts.get(adminId);
  if (attempts && attempts.count >= MAX_PIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < PIN_LOCKOUT_MS) {
      const minutesLeft = Math.ceil((PIN_LOCKOUT_MS - timeSinceLastAttempt) / 60000);
      return { success: false, adminId, error: `PIN bloqueado. Tente novamente em ${minutesLeft} minutos.` };
    }
    // Reset after lockout
    pinAttempts.delete(adminId);
  }

  // 3. Get PIN from request header
  const pin = request.headers.get('x-admin-pin');
  if (!pin) {
    return { success: false, adminId, error: 'PIN de segurança é obrigatório para esta ação' };
  }

  // 4. Get admin's hashed PIN from database
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: { securityPin: true, securityPinSetAt: true, adminPin: { select: { pinHash: true } } },
  });

  if (!admin) {
    return { success: false, adminId, error: 'Administrador não encontrado' };
  }

  // Determine which hash to use (prefer User.securityPin, fallback to AdminPin table)
  const pinHash = admin.securityPin || admin.adminPin?.pinHash;
  
  if (!pinHash) {
    return { success: false, adminId, error: 'PIN de segurança não configurado. Configure seu PIN antes de realizar ações sensíveis.' };
  }

  // 5. Verify PIN
  const isValid = await verifyPin(pin, pinHash);
  if (!isValid) {
    // Track failed attempt
    const current = pinAttempts.get(adminId) || { count: 0, lastAttempt: 0 };
    current.count += 1;
    current.lastAttempt = Date.now();
    pinAttempts.set(adminId, current);

    const attemptsLeft = MAX_PIN_ATTEMPTS - current.count;
    if (attemptsLeft <= 0) {
      return { success: false, adminId, error: 'PIN incorreto. Conta bloqueada por 15 minutos por excesso de tentativas.' };
    }
    return { success: false, adminId, error: `PIN incorreto. ${attemptsLeft} tentativa(s) restante(s).` };
  }

  // 6. Clear attempts on success
  pinAttempts.delete(adminId);

  return { success: true, adminId };
}
