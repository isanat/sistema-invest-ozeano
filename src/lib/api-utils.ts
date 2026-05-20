import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod/v4';
import { verifyToken } from './auth';

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
 */
export async function requireAdmin(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('mp_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload.userId;
}
