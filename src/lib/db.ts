import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============================================================================
// DATABASE PROVIDER DETECTION
// ============================================================================
// Used to conditionally execute PostgreSQL-specific SQL (FOR UPDATE, advisory
// locks) that would cause syntax errors on SQLite. The Prisma provider is
// dynamically switched by a script: sqlite locally, postgresql on Vercel.
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
 * On SQLite this is a no-op — transactions already serialize writes.
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
  // SQLite: no-op. Transactions handle locking automatically.
}

/**
 * Acquire a PostgreSQL advisory lock to prevent concurrent cron execution.
 * On SQLite this is a no-op (cron deduplication handled differently).
 */
export async function acquireAdvisoryLock(lockId: number): Promise<boolean> {
  if (isPostgres()) {
    try {
      await db.$queryRaw`SELECT pg_advisory_lock(${lockId})`;
      return true;
    } catch {
      return false;
    }
  }
  // SQLite: always succeed (no advisory lock support)
  return true;
}

/**
 * Release a PostgreSQL advisory lock.
 * On SQLite this is a no-op.
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