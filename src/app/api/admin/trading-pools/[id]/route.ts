import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, totalAum, dailyVolume, strategy, status, dailyRoi, weeklyRoi, monthlyRoi } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (totalAum !== undefined) updateData.totalAum = totalAum.toString();
    if (dailyVolume !== undefined) updateData.dailyVolume = dailyVolume.toString();
    if (strategy !== undefined) updateData.strategy = strategy;
    if (status !== undefined) updateData.status = status;
    if (dailyRoi !== undefined) updateData.dailyRoi = dailyRoi.toString();
    if (weeklyRoi !== undefined) updateData.weeklyRoi = weeklyRoi.toString();
    if (monthlyRoi !== undefined) updateData.monthlyRoi = monthlyRoi.toString();

    const pool = await db.tradingPool.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ pool });
  } catch (error) {
    console.error('Admin update trading pool error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
