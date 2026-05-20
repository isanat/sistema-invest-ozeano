import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// CRITICAL: JWT_SECRET must match exactly with auth.ts — no separate fallback
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET not set — using dev-only fallback. DO NOT use in production!');
}
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-only-fallback-NOT-FOR-PRODUCTION-CHANGE-ME'
);

// Public routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/crypto/prices',
  '/api/crypto/stats',
  '/api/exchange-rate',
  '/api/plans',
  '/api/cron/', // Cron uses Bearer token auth, not session
  '/api/admin/setup', // Setup is public (creates first admin)
  '/api/landing', // Public landing page data
];

// Rate limiting: simple in-memory store (per-instance, resets on redeploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_LOGIN = 10; // 10 login attempts per minute per IP
const RATE_LIMIT_MAX_REGISTER = 5; // 5 register attempts per minute per IP
const RATE_LIMIT_MAX_GENERAL = 60; // 60 requests per minute per IP for other auth routes

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let maxRequests = RATE_LIMIT_MAX_GENERAL;
  if (pathname === '/api/auth/login') maxRequests = RATE_LIMIT_MAX_LOGIN;
  else if (pathname === '/api/auth/register') maxRequests = RATE_LIMIT_MAX_REGISTER;

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt + 300_000) { // Remove 5 min after window
        rateLimitMap.delete(key);
      }
    }
  };
  // Run cleanup occasionally
  if (!globalThis.__rateLimitCleanup) {
    globalThis.__rateLimitCleanup = true;
    setInterval(cleanup, 300_000);
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to /api/ routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Rate limiting for auth-sensitive routes
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register' || pathname === '/api/auth/change-password') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    const { allowed, retryAfter } = checkRateLimit(ip, pathname);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns segundos.' },
        { 
          status: 429, 
          headers: { 'Retry-After': String(retryAfter || 60) } 
        }
      );
    }
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Read JWT from cookie
  const token = request.cookies.get('mp_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Verify payload has required fields
    if (!payload.userId || !payload.email || !payload.role) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // For admin routes, verify admin role
    if (pathname.startsWith('/api/admin/')) {
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    // Set user headers for downstream routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', payload.email as string);
    requestHeaders.set('x-user-role', payload.role as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Token expired or invalid
    return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};

// Extend globalThis for cleanup interval tracking
declare global {
  var __rateLimitCleanup: boolean | undefined;
}
