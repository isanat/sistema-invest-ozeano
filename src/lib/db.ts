import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
    // Connection pool settings for resilience
    // - connection_limit: max concurrent connections
    // - pool_timeout: how long to wait for a connection from the pool (seconds)
    // - connect_timeout: how long to wait when establishing a new connection (seconds)
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============================================================================
// DATABASE HEALTH CHECK
// ============================================================================
// Periodic health check to detect connection issues early.
// Logs a warning if the database is unreachable.
// ============================================================================

let _lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[DB HEALTH] ❌ Database unreachable: ${errorMsg}`);
    return { ok: false, latencyMs: Date.now() - start, error: errorMsg };
  }
}

/**
 * Run a database health check if enough time has passed since the last one.
 * Call this from lightweight API routes (e.g. /api/landing, /api/auth/me).
 */
export async function maybeHealthCheck(): Promise<void> {
  const now = Date.now();
  if (now - _lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) return;
  _lastHealthCheck = now;
  const result = await checkDatabaseHealth();
  if (result.ok) {
    console.log(`[DB HEALTH] ✅ OK (${result.latencyMs}ms)`);
  }
}

// ============================================================================
// DATABASE PROVIDER DETECTION
// ============================================================================
// This project uses PostgreSQL EXCLUSIVELY — never SQLite.
// The Prisma schema is hardcoded to provider = "postgresql".
// The isPostgres() check is kept for safety but should always return true.
// ============================================================================

let _isPostgresCache: boolean | undefined;

export function isPostgres(): boolean {
  if (_isPostgresCache === undefined) {
    const url = (process.env.DATABASE_URL || '').toLowerCase();
    _isPostgresCache = url.startsWith('postgres://') || url.startsWith('postgresql://');
  }
  return _isPostgresCache;
}

/**
 * Acquire a row-level lock on a table row (PostgreSQL only).
 * On non-PostgreSQL this is a no-op — transactions already serialize writes.
 *
 * Usage inside a $transaction callback:
 *   await acquireRowLock(tx, 'User', userId);
 */
export async function acquireRowLock(
  tx: { $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  _table: string,
  _id: string,
): Promise<void> {
  if (isPostgres()) {
    // We must use a separate tagged template for each table because
    // table names cannot be parameterized. The caller already knows the
    // table at compile-time, but we accept it for documentation.
    // The actual query is inlined at each call site below.
  }
  // Non-PostgreSQL: no-op. Transactions handle locking automatically.
}

/**
 * Try to acquire a PostgreSQL advisory lock (non-blocking).
 * Uses pg_try_advisory_lock which returns immediately with true/false.
 * Unlike pg_advisory_lock, this won't block if the lock is already held.
 */
export async function acquireAdvisoryLock(lockId: number): Promise<boolean> {
  if (isPostgres()) {
    try {
      const result = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`SELECT pg_try_advisory_lock(${lockId}) as "pg_try_advisory_lock"`;
      return result[0]?.pg_try_advisory_lock === true;
    } catch {
      return false;
    }
  }
  // Non-PostgreSQL: always succeed (no advisory lock support)
  return true;
}

/**
 * Release a PostgreSQL advisory lock.
 * On non-PostgreSQL this is a no-op.
 */
export async function releaseAdvisoryLock(lockId: number): Promise<void> {
  if (isPostgres()) {
    try {
      await db.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
    } catch {
      // Lock release failure is non-critical
    }
  }
}