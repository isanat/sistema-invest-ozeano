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
    const { name, minDirectReferrals, commissionBoost, icon, color } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (minDirectReferrals !== undefined) updateData.minDirectReferrals = parseInt(minDirectReferrals);
    if (commissionBoost !== undefined) updateData.commissionBoost = commissionBoost.toString();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;

    const rank = await db.affiliateRank.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ rank });
  } catch (error) {
    console.error('Admin update affiliate rank error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
