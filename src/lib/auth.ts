import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// CRITICAL: JWT_SECRET must be set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production. Server cannot start.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET not set — using dev-only fallback. DO NOT use in production!');
}
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-only-fallback-NOT-FOR-PRODUCTION-CHANGE-ME'
);

const COOKIE_NAME = 'mp_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

// ============ Password Hashing ============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============ JWT Token Management ============

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ============ Cookie-based Session ============

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============ Route Auth Helpers ============

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  // Re-verify role from database to prevent stale JWT privilege
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

// ============ Decimal Helpers (for PostgreSQL string storage) ============

export function d(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

export function ds(val: string | number | null | undefined): string {
  return d(val).toFixed(8);
}

export function dusdt(val: string | number | null | undefined): string {
  return d(val).toFixed(2);
}
