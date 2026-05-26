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
    const { name, avatar, specialty, winRate, totalPnl, monthlyRoi, riskLevel, strategy, isActive, isFeatured, sortOrder, followers, totalTrades } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (winRate !== undefined) updateData.winRate = winRate.toString();
    if (totalPnl !== undefined) updateData.totalPnl = totalPnl.toString();
    if (monthlyRoi !== undefined) updateData.monthlyRoi = monthlyRoi.toString();
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (strategy !== undefined) updateData.strategy = strategy;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (followers !== undefined) updateData.followers = followers;
    if (totalTrades !== undefined) updateData.totalTrades = totalTrades;

    const trader = await db.copyTrader.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ trader });
  } catch (error) {
    console.error('Admin update copy trader error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
