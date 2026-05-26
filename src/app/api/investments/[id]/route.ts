import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const investment = await db.investment.findUnique({
      where: { id },
      include: {
        plan: true,
        roiHistory: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Check if user owns this investment
    if (investment.userId !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const amount = parseFloat(investment.amount);
    const dailyRoiPct = parseFloat(investment.dailyRoi);
    const teamBonusPctVal = parseFloat(investment.teamBonusPct);
    const expectedDailyRoi = amount * ((dailyRoiPct + teamBonusPctVal) / 100);
    const totalExpectedRoi = expectedDailyRoi * investment.plan.duration;
    const progressPct = investment.plan.duration > 0
      ? Math.min((investment.daysElapsed / investment.plan.duration) * 100, 100)
      : 0;

    return NextResponse.json({
      investment: {
        id: investment.id,
        amount: investment.amount,
        dailyRoi: investment.dailyRoi,
        teamBonusPct: investment.teamBonusPct,
        totalRoi: investment.totalRoi,
        daysElapsed: investment.daysElapsed,
        isActive: investment.isActive,
        startedAt: investment.startedAt,
        expiresAt: investment.expiresAt,
        lastRoiAt: investment.lastRoiAt,
        createdAt: investment.createdAt,
        plan: investment.plan,
        roiHistory: investment.roiHistory,
        stats: {
          totalRoiEarned: parseFloat(investment.totalRoi).toFixed(2),
          expectedDailyRoi: expectedDailyRoi.toFixed(2),
          totalExpectedRoi: totalExpectedRoi.toFixed(2),
          progressPct: progressPct.toFixed(1),
        },
      },
    });
  } catch (error) {
    console.error('Get investment detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
