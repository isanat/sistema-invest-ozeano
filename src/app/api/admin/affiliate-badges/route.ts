import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// GET: List all badges
export async function GET() {
  try {
    await requireAdmin();

    const badges = await db.affiliateBadge.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { awards: true } },
      },
    });

    return apiSuccess({ badges });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Create a new badge
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const { name, description, icon, color, category, requirement, rewardType, rewardValue, isAuto, sortOrder, isActive } = body;

    if (!name || !icon || !requirement) {
      return apiError('Nome, ícone e requisito são obrigatórios');
    }

    // Validate requirement is valid JSON
    try {
      JSON.parse(requirement);
    } catch {
      return apiError('Requisito deve ser um JSON válido. Ex: {"type":"referrals","count":5}');
    }

    const badge = await db.affiliateBadge.create({
      data: {
        name,
        description: description || null,
        icon: icon || '🏅',
        color: color || '#CD7F32',
        category: category || 'general',
        requirement,
        rewardType: rewardType || 'none',
        rewardValue: rewardValue || '0',
        isAuto: isAuto !== false,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    });

    return apiSuccess({ badge, message: 'Badge criado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Update a badge
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return apiError('ID do badge é obrigatório');
    }

    // Validate requirement if provided
    if (updates.requirement) {
      try {
        JSON.parse(updates.requirement);
      } catch {
        return apiError('Requisito deve ser um JSON válido');
      }
    }

    const badge = await db.affiliateBadge.update({
      where: { id },
      data: updates,
    });

    return apiSuccess({ badge, message: 'Badge atualizado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Delete a badge (soft delete by setting isActive=false)
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID do badge é obrigatório');
    }

    await db.affiliateBadge.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ message: 'Badge desativado com sucesso!' });
  } catch (error) {
    return handleApiError(error);
  }
}
