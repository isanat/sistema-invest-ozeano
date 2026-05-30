import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  const status = dbHealth.ok ? 'healthy' : 'unhealthy';
  const httpStatus = dbHealth.ok ? 200 : 503;

  return NextResponse.json({
    status,
    database: {
      ok: dbHealth.ok,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error || undefined,
    },
    timestamp: new Date().toISOString(),
  }, { status: httpStatus });
}
