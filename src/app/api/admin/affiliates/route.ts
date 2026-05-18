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
      const [
        allCommissions,
        paidCommissions,
        pendingCommissions,
        allAffiliateWithdrawals,
        topAffiliates,
        levels,
      ] = await Promise.all([
        db.affiliateCommission.findMany({
          select: { commissionAmount: true, status: true },
        }),
        db.affiliateCommission.findMany({
          where: { status: 'paid' },
          select: { commissionAmount: true },
        }),
        db.affiliateCommission.findMany({
          where: { status: 'pending' },
          select: { commissionAmount: true },
        }),
        db.affiliateWithdrawal.findMany({
          select: { amount: true, fee: true },
        }),
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

      const totalCommissionAmount = allCommissions.reduce((s, c) => s + parseNum(c.commissionAmount), 0);
      const totalPaidAmount = paidCommissions.reduce((s, c) => s + parseNum(c.commissionAmount), 0);
      const totalPendingAmount = pendingCommissions.reduce((s, c) => s + parseNum(c.commissionAmount), 0);
      const totalWithdrawalAmount = allAffiliateWithdrawals.reduce((s, w) => s + parseNum(w.amount), 0);
      const totalWithdrawalFees = allAffiliateWithdrawals.reduce((s, w) => s + parseNum(w.fee), 0);

      const sortedTopAffiliates = topAffiliates.sort((a, b) => parseNum(b.totalAffiliateEarnings) - parseNum(a.totalAffiliateEarnings));

      return apiSuccess({
        stats: {
          totalCommissions: allCommissions.length,
          totalCommissionAmount,
          totalPaidAmount,
          totalPendingAmount,
          totalWithdrawals: allAffiliateWithdrawals.length,
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

    const where: any = {};
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

    console.log('[Admin/Affiliates] PUT body:', JSON.stringify(body));

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

      console.log('[Admin/Affiliates] Processing level:', JSON.stringify(normalized));

      const data = adminAffiliateLevelSchema.parse(normalized);

      console.log('[Admin/Affiliates] Parsed data:', JSON.stringify(data));

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

      console.log('[Admin/Affiliates] Upserted level:', JSON.stringify(level));

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
