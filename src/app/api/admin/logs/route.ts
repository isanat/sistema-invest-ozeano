import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );
    const entity = searchParams.get('entity') || '';
    const action = searchParams.get('action') || '';
    const adminId = searchParams.get('adminId') || '';

    const where: any = {};

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;

    const [logs, total] = await Promise.all([
      db.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.adminLog.count({ where }),
    ]);

    return apiSuccess({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
