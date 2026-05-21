import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d as parseNum } from '@/lib/auth';
import { adminAffiliateLevelSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, sanitizePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');

    // Get affiliate statistics
    if (action === 'stats') {
      // Bug 2: Use raw SQL SUM/COUNT aggregation instead of loading all records into memory
      const [
        commissionStats,
        withdrawalStats,
        topAffiliates,
        levels,
      ] = await Promise.all([
        db.$queryRaw<
          Array<{ totalAmount: number; cnt: bigint; status: string }>
        >`SELECT COALESCE(SUM(CAST("commissionAmount" AS REAL)), 0) as totalAmount, COUNT(*) as cnt, status FROM "AffiliateCommission" GROUP BY status`,
        db.$queryRaw<
          Array<{ totalAmount: number; totalFees: number; cnt: bigint }>
        >`SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as totalAmount, COALESCE(SUM(CAST(fee AS REAL)), 0) as totalFees, COUNT(*) as cnt FROM "AffiliateWithdrawal"`,
        db.user.findMany({
          where: {
            totalAffiliateEarnings: { not: '0' },
          },
          take: 10,
          select: {
            id: true,
            name: true,
            email: true,
            affiliateCode: true,
            totalAffiliateEarnings: true,
            affiliateBalance: true,
            _count: {
              select: { referrals: true },
            },
          },
        }),
        db.affiliateLevel.findMany({ orderBy: { level: 'asc' } }),
      ]);

      // Aggregate commission stats by status
      const totalCommissionAmount = commissionStats.reduce((s, r) => s + Number(r.totalAmount), 0);
      const totalCommissions = commissionStats.reduce((s, r) => s + Number(r.cnt), 0);
      const totalPaidAmount = Number(commissionStats.find(r => r.status === 'paid')?.totalAmount || 0);
      const totalPendingAmount = Number(commissionStats.find(r => r.status === 'pending')?.totalAmount || 0);

      const totalWithdrawalAmount = Number(withdrawalStats[0]?.totalAmount || 0);
      const totalWithdrawalFees = Number(withdrawalStats[0]?.totalFees || 0);
      const totalWithdrawals = Number(withdrawalStats[0]?.cnt || 0);

      const sortedTopAffiliates = topAffiliates.sort((a, b) => parseNum(b.totalAffiliateEarnings) - parseNum(a.totalAffiliateEarnings));

      return apiSuccess({
        stats: {
          totalCommissions,
          totalCommissionAmount,
          totalPaidAmount,
          totalPendingAmount,
          totalWithdrawals,
          totalWithdrawalAmount,
          totalWithdrawalFees,
          topAffiliates: sortedTopAffiliates,
        },
        levels,
      });
    }

    // List affiliate commissions with filters
    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );
    const status = searchParams.get('status') || '';
    const level = searchParams.get('level') || '';

    const where: Record<string, string | number> = {};
    if (status) where.status = status;
    if (level) where.level = parseInt(level);

    const [commissions, total] = await Promise.all([
      db.affiliateCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.affiliateCommission.count({ where }),
    ]);

    // Also return affiliate levels
    const levels = await db.affiliateLevel.findMany({
      orderBy: { level: 'asc' },
    });

    return apiSuccess({
      commissions,
      levels,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();



    // Support single or batch update of affiliate levels
    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of items) {
      // Normalize: ensure percentage is a string (frontend may send number)
      const normalized = {
        ...item,
        percentage: typeof item.percentage === 'number'
          ? String(item.percentage)
          : item.percentage,
        isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      };



      const data = adminAffiliateLevelSchema.parse(normalized);



      const existing = await db.affiliateLevel.findUnique({
        where: { level: data.level },
      });

      const level = await db.affiliateLevel.upsert({
        where: { level: data.level },
        update: {
          percentage: data.percentage,
          description: data.description,
          isActive: data.isActive,
        },
        create: {
          level: data.level,
          percentage: data.percentage,
          description: data.description || `Nível ${data.level}`,
          isActive: data.isActive,
        },
      });



      // Log
      try {
        await db.adminLog.create({
          data: {
            adminId: session.userId,
            action: existing ? 'update' : 'create',
            entity: 'affiliate_level',
            entityId: level.id,
            oldValue: existing ? JSON.stringify(existing) : undefined,
            newValue: JSON.stringify(data),
            description: `Nível afiliado ${data.level} ${existing ? 'atualizado' : 'criado'}: ${data.percentage}%`,
          },
        });
      } catch (logErr) {
        console.error('[Admin/Affiliates] Log error (non-critical):', logErr);
      }

      results.push(level);
    }

    return apiSuccess({ levels: results });
  } catch (error) {
    console.error('[Admin/Affiliates] PUT error:', error);
    return handleApiError(error);
  }
}
