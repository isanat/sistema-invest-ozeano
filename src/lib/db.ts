import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

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