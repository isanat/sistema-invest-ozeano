import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod/v4';
import { verifyToken } from './auth';
import { db } from './db';

// ============================================================================
// Business Error - for expected business logic errors (400-level)
// Use this instead of generic Error for user-facing validation failures
// ============================================================================
export class BusinessError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'BusinessError';
    this.status = status;
  }
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Sanitize pagination parameters to prevent abuse.
 * Caps limit at MAX_PAGE_LIMIT (100) and ensures page >= 1.
 */
const MAX_PAGE_LIMIT = 100;

export function sanitizePagination(page: number | string, limit: number | string): { page: number; limit: number; skip: number } {
  const p = Math.max(1, typeof page === 'string' ? parseInt(page) || 1 : page);
  const l = Math.min(MAX_PAGE_LIMIT, Math.max(1, typeof limit === 'string' ? parseInt(limit) || 20 : limit));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function apiSuccess(data: any, statusOrMessage: number | string = 200) {
  if (typeof statusOrMessage === 'string') {
    // If a message string is passed instead of a status code, include it in the data
    return NextResponse.json({ success: true, message: statusOrMessage, ...data }, { status: 200 });
  }
  return NextResponse.json({ success: true, ...data }, { status: statusOrMessage });
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    const firstError = error.issues[0];
    return apiError(firstError?.message ?? 'Validation error', 400);
  }

  if (error instanceof BusinessError) {
    return apiError(error.message, error.status);
  }

  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return apiError('Não autorizado', 401);
    }
    if (error.message.startsWith('Forbidden')) {
      return apiError('Acesso negado', 403);
    }
    // Don't leak internal errors in production
    if (process.env.NODE_ENV === 'production') {
      return apiError('Erro interno do servidor', 500);
    }
    return apiError(error.message, 500);
  }

  return apiError('Erro desconhecido', 500);
}

/**
 * Extract user ID from the request's session cookie.
 * Returns userId string if authenticated, or null if not.
 */
export async function requireAuth(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('mp_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return payload.userId;
}

/**
 * Extract admin user ID from the request's session cookie.
 * Returns adminId string if authenticated and admin, or null if not.
 * Re-verifies the role from the database to prevent stale JWT privilege escalation.
 */
export async function requireAdmin(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('mp_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) return null;

  // Re-verify role from database to prevent stale JWT privilege escalation
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return null;

  return payload.userId;
}

export async function requireSuperAdmin(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('mp_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'super_admin') return null;

  // Re-verify role from database to prevent stale JWT privilege escalation
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });
  if (!user || user.role !== 'super_admin') return null;

  return payload.userId;
}

/**
 * Extract the real IP address from a NextRequest.
 * Checks X-Forwarded-For (first IP), X-Real-IP, then falls back to request.ip or 'unknown'.
 */
export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For may contain multiple IPs; the first is the original client
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  // request.ip is available in some Next.js deployments
  if ((request as any).ip) return (request as any).ip;

  return 'unknown';
}

/**
 * @deprecated Use getClientIp() instead — same function, clearer name.
 */
export const getIpFromRequest = getClientIp;
