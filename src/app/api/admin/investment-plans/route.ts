import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/investment-plans - Get all plans (including inactive)
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await db.investmentPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { investments: true } },
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Admin get plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/investment-plans - Create new plan
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, minAmount, maxAmount, dailyRoi, duration, isActive, sortOrder, icon, color } = body;

    if (!name || !minAmount || !dailyRoi || !duration) {
      return NextResponse.json(
        { error: 'Name, minAmount, dailyRoi, and duration are required' },
        { status: 400 }
      );
    }

    const plan = await db.investmentPlan.create({
      data: {
        name,
        description,
        minAmount: minAmount.toString(),
        maxAmount: maxAmount ? maxAmount.toString() : null,
        dailyRoi: dailyRoi.toString(),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
        icon,
        color,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Admin create plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
