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
    const { name, email, balance, totalInvested, totalRoi, isActive, role, teamBonusPct, hasInvested } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (balance !== undefined) updateData.balance = balance.toString();
    if (totalInvested !== undefined) updateData.totalInvested = totalInvested.toString();
    if (totalRoi !== undefined) updateData.totalRoi = totalRoi.toString();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;
    if (teamBonusPct !== undefined) updateData.teamBonusPct = teamBonusPct.toString();
    if (hasInvested !== undefined) updateData.hasInvested = hasInvested;

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        balance: user.balance,
        totalInvested: user.totalInvested,
        totalRoi: user.totalRoi,
        isActive: user.isActive,
        teamBonusPct: user.teamBonusPct,
        hasInvested: user.hasInvested,
      },
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
