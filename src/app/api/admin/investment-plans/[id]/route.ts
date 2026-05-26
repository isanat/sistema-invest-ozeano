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
    const { name, description, minAmount, maxAmount, dailyRoi, duration, isActive, sortOrder, icon, color } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (minAmount !== undefined) updateData.minAmount = minAmount.toString();
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? maxAmount.toString() : null;
    if (dailyRoi !== undefined) updateData.dailyRoi = dailyRoi.toString();
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;

    const plan = await db.investmentPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Admin update plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
