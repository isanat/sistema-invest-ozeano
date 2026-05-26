import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/affiliate-levels - Get all 11 levels
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const levels = await db.affiliateLevel.findMany({
      orderBy: { level: 'asc' },
    });

    return NextResponse.json({ levels });
  } catch (error) {
    console.error('Admin get affiliate levels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/affiliate-levels - Update level percentages
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { levels } = body;

    if (!levels || !Array.isArray(levels)) {
      return NextResponse.json(
        { error: 'Levels array is required' },
        { status: 400 }
      );
    }

    const updatedLevels = [];

    for (const levelData of levels) {
      const { level, percentage } = levelData;
      if (!level || percentage === undefined) continue;

      const updated = await db.affiliateLevel.upsert({
        where: { level },
        update: { percentage: percentage.toString() },
        create: {
          level,
          percentage: percentage.toString(),
          description: `Level ${level}`,
        },
      });

      updatedLevels.push(updated);
    }

    return NextResponse.json({ levels: updatedLevels });
  } catch (error) {
    console.error('Admin update affiliate levels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
