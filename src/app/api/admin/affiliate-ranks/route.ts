import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// Default rank seeds
const DEFAULT_RANKS = [
  {
    name: 'Bronze',
    icon: '🥉',
    color: '#CD7F32',
    minReferrals: 1,
    minEarnings: '0',
    bonusAmount: '5',
    commissionBoost: '0',
    perks: JSON.stringify(['Acesso ao programa de afiliados', 'Suporte básico']),
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Silver',
    icon: '🥈',
    color: '#C0C0C0',
    minReferrals: 5,
    minEarnings: '50',
    bonusAmount: '25',
    commissionBoost: '0.5',
    perks: JSON.stringify(['Bônus de $25', 'Aumento de 0.5% na comissão', 'Suporte prioritário']),
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Gold',
    icon: '🥇',
    color: '#FFD700',
    minReferrals: 15,
    minEarnings: '200',
    bonusAmount: '75',
    commissionBoost: '1',
    perks: JSON.stringify(['Bônus de $75', 'Aumento de 1% na comissão', 'Suporte VIP', 'Acesso antecipado a novos recursos']),
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Platinum',
    icon: '💎',
    color: '#E5E4E2',
    minReferrals: 50,
    minEarnings: '1000',
    bonusAmount: '200',
    commissionBoost: '2',
    perks: JSON.stringify(['Bônus de $200', 'Aumento de 2% na comissão', 'Gerente de conta dedicado', 'Relatórios avançados']),
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Diamond',
    icon: '👑',
    color: '#B9F2FF',
    minReferrals: 100,
    minEarnings: '5000',
    bonusAmount: '500',
    commissionBoost: '3',
    perks: JSON.stringify(['Bônus de $500', 'Aumento de 3% na comissão', 'Todos os benefícios', 'Convites para eventos exclusivos', 'Comissões prioritárias']),
    sortOrder: 5,
    isActive: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Seed default ranks if none exist
    const existingCount = await db.affiliateRank.count();
    if (existingCount === 0) {
      await db.affiliateRank.createMany({ data: DEFAULT_RANKS });
    }

    const ranks = await db.affiliateRank.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return apiSuccess({ ranks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      name,
      icon = '🎯',
      color = '#CD7F32',
      minReferrals = 0,
      minEarnings = '0',
      bonusAmount = '0',
      commissionBoost = '0',
      perks,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!name) {
      return apiError('Nome do rank é obrigatório');
    }

    // Check unique name
    const existing = await db.affiliateRank.findUnique({ where: { name } });
    if (existing) {
      return apiError('Já existe um rank com este nome', 409);
    }

    const rank = await db.affiliateRank.create({
      data: {
        name,
        icon,
        color,
        minReferrals,
        minEarnings,
        bonusAmount,
        commissionBoost,
        perks: perks ? (typeof perks === 'string' ? perks : JSON.stringify(perks)) : null,
        sortOrder,
        isActive,
      },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'affiliate_rank',
        entityId: rank.id,
        newValue: JSON.stringify(body),
        description: `Rank de afiliado criado: ${rank.name}`,
      },
    });

    return apiSuccess({ rank }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiError('ID do rank é obrigatório');
    }

    const existing = await db.affiliateRank.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Rank não encontrado', 404);
    }

    // Check unique name (excluding self)
    if (updateData.name && updateData.name !== existing.name) {
      const nameConflict = await db.affiliateRank.findUnique({ where: { name: updateData.name } });
      if (nameConflict) {
        return apiError('Já existe um rank com este nome', 409);
      }
    }

    // Build update data object
    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.icon !== undefined) data.icon = updateData.icon;
    if (updateData.color !== undefined) data.color = updateData.color;
    if (updateData.minReferrals !== undefined) data.minReferrals = updateData.minReferrals;
    if (updateData.minEarnings !== undefined) data.minEarnings = updateData.minEarnings;
    if (updateData.bonusAmount !== undefined) data.bonusAmount = updateData.bonusAmount;
    if (updateData.commissionBoost !== undefined) data.commissionBoost = updateData.commissionBoost;
    if (updateData.perks !== undefined) {
      data.perks = typeof updateData.perks === 'string' ? updateData.perks : JSON.stringify(updateData.perks);
    }
    if (updateData.sortOrder !== undefined) data.sortOrder = updateData.sortOrder;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    const rank = await db.affiliateRank.update({
      where: { id },
      data,
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'affiliate_rank',
        entityId: rank.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Rank de afiliado atualizado: ${rank.name}`,
      },
    });

    return apiSuccess({ rank });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID do rank é obrigatório');
    }

    const existing = await db.affiliateRank.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Rank não encontrado', 404);
    }

    // Soft delete
    const rank = await db.affiliateRank.update({
      where: { id },
      data: { isActive: false },
    });

    // Log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'delete',
        entity: 'affiliate_rank',
        entityId: rank.id,
        oldValue: JSON.stringify(existing),
        description: `Rank de afiliado desativado: ${rank.name}`,
      },
    });

    return apiSuccess({ rank });
  } catch (error) {
    return handleApiError(error);
  }
}
