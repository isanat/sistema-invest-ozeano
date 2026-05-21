import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check environment
  results.databaseUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.substring(0, 30) + '...'
    : 'NOT SET';
  results.nodeEnv = process.env.NODE_ENV;

  // 2. Try Prisma query
  try {
    const prisma = new PrismaClient();
    results.prismaConnect = 'attempting...';

    const userCount = await prisma.user.count();
    results.userCount = userCount;
    results.prismaConnect = 'SUCCESS';

    await prisma.$disconnect();
  } catch (error: unknown) {
    results.prismaConnect = 'FAILED';
    if (error instanceof Error) {
      results.errorName = error.name;
      results.errorMessage = error.message;
      results.errorStack = error.stack?.substring(0, 500);
    } else {
      results.error = String(error);
    }
  }

  // 3. Try raw SQL
  try {
    const prisma = new PrismaClient();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    results.rawSql = result;
    await prisma.$disconnect();
  } catch (error: unknown) {
    results.rawSql = 'FAILED';
    if (error instanceof Error) {
      results.rawSqlError = error.message;
    }
  }

  return NextResponse.json(results, { status: 200 });
}
