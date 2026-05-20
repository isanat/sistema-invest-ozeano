import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// Type defaults based on voucher type
const VOUCHER_DEFAULTS: Record<string, {
  amount: string;
  goalDirectReferrals: number;
  goalMinReferralInvest: string;
  goalNetworkMultiple: string;
  goalDays: number;
}> = {
  basic: {
    amount: '500',
    goalDirectReferrals: 5,
    goalMinReferralInvest: '100',
    goalNetworkMultiple: '3',
    goalDays: 30,
  },
  premium: {
    amount: '2000',
    goalDirectReferrals: 10,
    goalMinReferralInvest: '200',
    goalNetworkMultiple: '5',
    goalDays: 45,
  },
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const vouchers = await db.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate progress for each voucher
    const vouchersWithProgress = vouchers.map((v) => {
      const amount = d(v.amount);
      const usedAmount = d(v.usedAmount);
      const goalNetworkTarget = d(v.goalNetworkMultiple) * amount;
      const currentNetwork = d(v.currentNetworkInvestment);
      const referralProgress = v.goalDirectReferrals > 0
        ? (v.qualifyingReferrals / v.goalDirectReferrals) * 100
        : 0;
      const networkProgress = goalNetworkTarget > 0
        ? (currentNetwork / goalNetworkTarget) * 100
        : 0;
      const goalPct = Math.min(100, Math.round(Math.min(referralProgress, networkProgress)));
      const remainingBalance = amount - usedAmount;

      return {
        ...v,
        availableBalance: dusdt(remainingBalance),
        goalCompletionPct: goalPct,
        referralProgress: Math.round(referralProgress),
        networkProgress: Math.round(networkProgress),
        goalNetworkTarget: dusdt(goalNetworkTarget),
      };
    });

    return apiSuccess({ vouchers: vouchersWithProgress });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      userId,
      amount: rawAmount,
      type = 'custom',
      goalDirectReferrals: rawGoalDirectReferrals,
      goalMinReferralInvest: rawGoalMinReferralInvest,
      goalNetworkMultiple: rawGoalNetworkMultiple,
      goalDays: rawGoalDays,
      adminNotes,
    } = body;

    if (!userId) {
      return apiError('Selecione um usuário (líder)');
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return apiError('Usuário não encontrado', 404);
    }

    // Apply type defaults, allow overrides - coerce all values to proper types
    const defaults = VOUCHER_DEFAULTS[type];
    const amount = rawAmount != null && rawAmount !== '' ? String(rawAmount) : defaults?.amount;
    const goalDirectReferrals = rawGoalDirectReferrals != null && rawGoalDirectReferrals !== '' ? Number(rawGoalDirectReferrals) : defaults?.goalDirectReferrals;
    const goalMinReferralInvest = rawGoalMinReferralInvest != null && rawGoalMinReferralInvest !== '' ? String(rawGoalMinReferralInvest) : defaults?.goalMinReferralInvest;
    const goalNetworkMultiple = rawGoalNetworkMultiple != null && rawGoalNetworkMultiple !== '' ? String(rawGoalNetworkMultiple) : defaults?.goalNetworkMultiple;
    const goalDays = rawGoalDays != null && rawGoalDays !== '' ? Number(rawGoalDays) : defaults?.goalDays;

    if (!amount || d(amount) <= 0) {
      return apiError('Valor do voucher deve ser maior que zero. Preencha o campo "Valor (USDT)".');
    }
    if (!goalDirectReferrals || isNaN(goalDirectReferrals) || goalDirectReferrals <= 0) {
      return apiError('Quantidade de indicações necessárias deve ser maior que zero. Preencha o campo "Indicações necessárias".');
    }
    if (!goalDays || isNaN(goalDays) || goalDays <= 0) {
      return apiError('Prazo em dias deve ser maior que zero. Preencha o campo "Prazo (dias)".');
    }
    if (!goalMinReferralInvest || d(goalMinReferralInvest) <= 0) {
      return apiError('Investimento mínimo por indicação deve ser maior que zero. Preencha o campo "Invest. mínimo por ref.".');
    }
    if (!goalNetworkMultiple || d(goalNetworkMultiple) <= 0) {
      return apiError('Múltiplo de investimento da rede deve ser maior que zero. Preencha o campo "Múltiplo de investimento da rede".');
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + goalDays);

    // Use transaction for atomicity
    const voucher = await db.$transaction(async (tx) => {
      // Add voucherBalance to user (PostgreSQL: CAST AS NUMERIC)
      await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = (CAST("voucherBalance" AS NUMERIC) + ${d(amount)})::text WHERE id = ${userId}`;

      // Create voucher
      const v = await tx.voucher.create({
        data: {
          userId,
          amount: String(amount),
          type,
          status: 'active',
          goalDirectReferrals,
          goalMinReferralInvest: String(goalMinReferralInvest),
          goalNetworkMultiple: String(goalNetworkMultiple),
          goalDays,
          deadline,
          createdBy: session.userId,
          adminNotes: adminNotes || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return v;
    });

    // Create admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'voucher',
        entityId: voucher.id,
        newValue: JSON.stringify({ userId, amount, type, goalDirectReferrals, goalMinReferralInvest, goalNetworkMultiple, goalDays }),
        description: `Voucher criado: ${dusdt(amount)} USDT para ${user.name} (${user.email})`,
      },
    });

    return apiSuccess({ voucher }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
