import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const plans = await db.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Get investment plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
