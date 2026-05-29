// ============================================================================
// FIX ORPHANED REFERRALS — Admin endpoint to find and fix users who were
// created without proper referral attribution due to the case-sensitivity bug
// ============================================================================
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/fix-referrals — Find orphaned users (no referredBy but likely referred)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Find all users who have NO referredBy but who DO have an affiliateCode
    // These are users who registered without a referral link
    const allUsers = await db.user.findMany({
      where: {
        role: 'user',
        referredBy: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        hasInvested: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get all users WITH referredBy for context
    const referredUsers = await db.user.findMany({
      where: {
        role: 'user',
        referredBy: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        referredBy: true,
        hasInvested: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all affiliate codes for lookup
    const affiliates = await db.user.findMany({
      where: {
        affiliateCode: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
      },
    });

    return apiSuccess({
      orphanedUsers: allUsers,
      referredUsers,
      affiliates,
      summary: {
        totalUsers: allUsers.length + referredUsers.length,
        orphanedCount: allUsers.length,
        referredCount: referredUsers.length,
        totalAffiliates: affiliates.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/fix-referrals — Assign a sponsor to an orphaned user
// Body: { userId: string, sponsorAffiliateCode: string }
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId, sponsorAffiliateCode } = body;

    if (!userId || !sponsorAffiliateCode) {
      throw new BusinessError('userId e sponsorAffiliateCode são obrigatórios');
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, referredBy: true },
    });

    if (!user) {
      throw new BusinessError('Usuário não encontrado');
    }

    if (user.referredBy) {
      throw new BusinessError('Este usuário já tem um patrocinador. Use PUT para alterar.');
    }

    // Find the sponsor by affiliate code (codes are stored uppercase)
    const upperCode = sponsorAffiliateCode.toUpperCase();
    const sponsor = await db.user.findFirst({
      where: {
        affiliateCode: upperCode,
      },
      select: { id: true, name: true, email: true, affiliateCode: true },
    });

    if (!sponsor) {
      throw new BusinessError(`Patrocinador com código "${sponsorAffiliateCode}" não encontrado`);
    }

    if (sponsor.id === userId) {
      throw new BusinessError('Um usuário não pode ser patrocinador de si mesmo');
    }

    // Assign the sponsor
    const updated = await db.user.update({
      where: { id: userId },
      data: { referredBy: sponsor.id },
    });

    // Log the action
    await db.adminLog.create({
      data: {
        action: 'fix_referral',
        entity: 'user',
        entityId: userId,
        oldValue: JSON.stringify({ referredBy: null }),
        newValue: JSON.stringify({ referredBy: sponsor.id, sponsorName: sponsor.name, sponsorEmail: sponsor.email }),
        description: `Atribuído patrocinador: ${sponsor.name} (${sponsor.affiliateCode}) → ${user.name} (${user.email})`,
      },
    });

    return apiSuccess({
      message: `Patrocinador atribuído: ${sponsor.name} → ${user.name}`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        referredBy: updated.referredBy,
      },
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        email: sponsor.email,
        affiliateCode: sponsor.affiliateCode,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/fix-referrals — Change an existing sponsor assignment
// Body: { userId: string, sponsorAffiliateCode: string }
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId, sponsorAffiliateCode } = body;

    if (!userId || !sponsorAffiliateCode) {
      throw new BusinessError('userId e sponsorAffiliateCode são obrigatórios');
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, referredBy: true },
    });

    if (!user) {
      throw new BusinessError('Usuário não encontrado');
    }

    // Find the sponsor by affiliate code (codes are stored uppercase)
    const upperCode = sponsorAffiliateCode.toUpperCase();
    const sponsor = await db.user.findFirst({
      where: {
        affiliateCode: upperCode,
      },
      select: { id: true, name: true, email: true, affiliateCode: true },
    });

    if (!sponsor) {
      throw new BusinessError(`Patrocinador com código "${sponsorAffiliateCode}" não encontrado`);
    }

    if (sponsor.id === userId) {
      throw new BusinessError('Um usuário não pode ser patrocinador de si mesmo');
    }

    const oldReferredBy = user.referredBy;

    // Update the sponsor
    const updated = await db.user.update({
      where: { id: userId },
      data: { referredBy: sponsor.id },
    });

    // Log the action
    await db.adminLog.create({
      data: {
        action: 'change_referral',
        entity: 'user',
        entityId: userId,
        oldValue: JSON.stringify({ referredBy: oldReferredBy }),
        newValue: JSON.stringify({ referredBy: sponsor.id, sponsorName: sponsor.name, sponsorEmail: sponsor.email }),
        description: `Patrocinador alterado: ${sponsor.name} (${sponsor.affiliateCode}) → ${user.name} (${user.email})`,
      },
    });

    return apiSuccess({
      message: `Patrocinador alterado: ${sponsor.name} → ${user.name}`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        referredBy: updated.referredBy,
      },
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        email: sponsor.email,
        affiliateCode: sponsor.affiliateCode,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
