import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { investmentSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';
import { processCommissions } from '@/lib/affiliate';

// GET /api/investments — Returns user's active investments
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const investments = await db.investment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: { id: true, name: true, dailyRoiPct: true, durationDays: true, minAmount: true, maxAmount: true, description: true, isActive: true, isFeatured: true, sortOrder: true },
        },
      },
    });

    // Get summary stats
    const activeInvestments = investments.filter(i => i.status === 'active');
    const totalActiveAmount = activeInvestments.reduce((sum, i) => sum + d(i.amount), 0);
    const totalActiveDailyRoi = activeInvestments.reduce((sum, i) => sum + d(i.dailyRoi), 0);
    const totalAccumulatedRoi = investments.reduce((sum, i) => sum + d(i.accumulatedRoi), 0);

    return apiSuccess({
      investments,
      stats: {
        activeCount: activeInvestments.length,
        totalActiveAmount: dusdt(totalActiveAmount),
        totalDailyRoi: dusdt(totalActiveDailyRoi),
        totalAccumulatedRoi: dusdt(totalAccumulatedRoi),
        totalCount: investments.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/investments — Create a new investment
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = investmentSchema.parse(body);
    const useVoucher = body.useVoucher === true;
    const voucherId = body.voucherId as string | undefined;

    // Use transaction for atomicity with row lock
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent balance modifications
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
      }

      // Get user
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new BusinessError('Usuário não encontrado', 404);

      // Get investment plan (planId is optional in schema — can be null)
      const plan = data.planId ? await tx.investmentPlan.findUnique({ where: { id: data.planId } }) : null;

      // If planId provided but plan not found, try to find by name (for default/legacy plans)
      // or allow investment without plan if planId looks like a default plan ID
      let effectivePlan = plan;
      if (!plan && data.planId) {
        // Try to find by name (e.g., 'starter', 'growth', 'premium', 'elite')
        const planByName = await tx.investmentPlan.findFirst({ 
          where: { name: { equals: data.planId, mode: 'insensitive' }, isActive: true } 
        });
        if (planByName) {
          effectivePlan = planByName;
        }
      }

      // Validate amount against plan limits (if plan exists)
      let minAmount = 5; // Default minimum
      let maxAmount = Infinity;
      let dailyRoiPct = 3.3; // Default ROI
      let durationDays = 60; // Default duration
      let planName = 'Copy Trading';

      if (effectivePlan) {
        if (!effectivePlan.isActive) throw new BusinessError('Plano de investimento não está disponível');
        minAmount = d(effectivePlan.minAmount);
        maxAmount = effectivePlan.maxAmount ? d(effectivePlan.maxAmount) : Infinity;
        dailyRoiPct = d(effectivePlan.dailyRoiPct);
        durationDays = effectivePlan.durationDays;
        planName = effectivePlan.name;
      } else {
        throw new BusinessError('Plano de investimento inválido. Selecione um plano existente.');
      }

      if (data.amount < minAmount) {
        throw new BusinessError(`Investimento mínimo para este plano é ${dusdt(minAmount)} USDT`);
      }
      if (data.amount > maxAmount) {
        throw new BusinessError(`Investimento máximo para este plano é ${dusdt(maxAmount)} USDT`);
      }

      // Calculate investment parameters
      const amount = data.amount;
      const dailyRoi = amount * (dailyRoiPct / 100);
      const totalRoi = dailyRoi * durationDays;

      // Get user's rank bonus
      let rankBonusPct = 0;
      const ranks = await tx.affiliateRank.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'desc' },
      });
      const userTotalEarnings = d(user.totalAffiliateEarnings);
      const directReferrals = await tx.user.count({
        where: { referredBy: user.id },
      });
      for (const rank of ranks) {
        if (directReferrals >= rank.minReferrals && userTotalEarnings >= d(rank.minEarnings)) {
          rankBonusPct = d(rank.commissionBoost);
          break;
        }
      }

      if (useVoucher && voucherId) {
        // ========== VOUCHER PAYMENT FLOW ==========
        const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
        if (!voucher) throw new BusinessError('Voucher não encontrado');
        if (voucher.userId !== session.userId) throw new BusinessError('Este voucher não pertence ao seu usuário');
        if (voucher.status !== 'active') throw new BusinessError(`Voucher não está ativo (status: ${voucher.status})`);

        const voucherAmount = d(voucher.amount);
        const usedAmount = d(voucher.usedAmount);
        const remainingBalance = voucherAmount - usedAmount;

        if (remainingBalance < amount) {
          throw new BusinessError(`Saldo insuficiente no voucher. Disponível: ${dusdt(remainingBalance)} USDT, Necessário: ${dusdt(amount)} USDT`);
        }

        // Check user voucher balance matches
        const userVoucherBalance = d(user.voucherBalance);
        if (userVoucherBalance < amount) {
          throw new BusinessError(`Saldo de voucher insuficiente. Disponível: ${dusdt(userVoucherBalance)} USDT`);
        }

        // Deduct from user's voucherBalance (PostgreSQL)
        await tx.$executeRaw`UPDATE "User" SET "voucherBalance" = CAST((CAST("voucherBalance" AS NUMERIC) - ${amount}) AS TEXT), "totalInvested" = CAST((CAST("totalInvested" AS NUMERIC) + ${amount}) AS TEXT), "hasInvested" = true, "linkUnlocked" = true WHERE id = ${session.userId}`;

        // Update voucher usedAmount
        const newUsedAmount = usedAmount + amount;
        await tx.voucher.update({
          where: { id: voucherId },
          data: { usedAmount: dusdt(newUsedAmount) },
        });

        // Create investment (planId may be null for default/legacy plans)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        const investment = await tx.investment.create({
          data: {
            userId: session.userId,
            planId: effectivePlan?.id || null,
            amount: ds(amount),
            dailyRoi: ds(dailyRoi),
            dailyRoiPct: ds(dailyRoiPct),
            totalRoi: ds(totalRoi),
            startDate,
            endDate,
            teamBonusPct: ds(rankBonusPct),
            status: 'active',
            source: 'voucher', // Investment funded by voucher
          },
          include: {
            plan: { select: { id: true, name: true, dailyRoiPct: true, durationDays: true } },
          },
        });

        // Create VoucherUsage record
        await tx.voucherUsage.create({
          data: {
            voucherId,
            investmentId: investment.id,
            amount: dusdt(amount),
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: session.userId,
            type: 'investment',
            amount: ds(amount),
            status: 'completed',
            description: `Investimento ${planName} - ${durationDays} dias (Voucher)`,
            referenceId: investment.id,
            referenceType: 'Investment',
          },
        });

        return { investment, amount, dailyRoi, totalRoi, usedVoucher: true };

      } else {
        // ========== REGULAR BALANCE PAYMENT FLOW ==========
        const currentBalance = d(user.balance);
        if (currentBalance < amount) {
          throw new BusinessError(`Saldo insuficiente. Necessário: ${dusdt(amount)} USDT, Disponível: ${dusdt(currentBalance)} USDT`);
        }

        // Deduct balance atomically (PostgreSQL)
        await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) - ${amount}) AS TEXT), "totalInvested" = CAST((CAST("totalInvested" AS NUMERIC) + ${amount}) AS TEXT), "hasInvested" = true, "linkUnlocked" = true WHERE id = ${session.userId} AND CAST(balance AS NUMERIC) >= ${amount}`;
        // Verify the deduction actually happened
        const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
        if (d(updatedUser!.balance) === currentBalance) {
          throw new BusinessError(`Saldo insuficiente. Necessário: ${dusdt(amount)} USDT`);
        }

        // Create investment (planId may be null for default/legacy plans)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        const investment = await tx.investment.create({
          data: {
            userId: session.userId,
            planId: effectivePlan?.id || null,
            amount: ds(amount),
            dailyRoi: ds(dailyRoi),
            dailyRoiPct: ds(dailyRoiPct),
            totalRoi: ds(totalRoi),
            startDate,
            endDate,
            teamBonusPct: ds(rankBonusPct),
            status: 'active',
            source: 'deposit', // Investment funded by own balance
          },
          include: {
            plan: { select: { id: true, name: true, dailyRoiPct: true, durationDays: true } },
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: session.userId,
            type: 'investment',
            amount: ds(amount),
            status: 'completed',
            description: `Investimento ${planName} - ${durationDays} dias`,
            referenceId: investment.id,
            referenceType: 'Investment',
          },
        });

        return { investment, amount, dailyRoi, totalRoi, usedVoucher: false };
      }
    });

    // Only process affiliate commissions for deposit-funded investments
    // Voucher-funded investments don't generate commissions (platform money)
    if (!result.usedVoucher) {
      try {
        await processCommissions(session.userId, result.amount, 'subscription', result.investment.id);
      } catch (commError) {
        console.error('Affiliate commission error:', commError);
      }
    }

    return apiSuccess({
      investment: result.investment,
      pricing: {
        amount: dusdt(result.amount),
        dailyRoi: dusdt(result.dailyRoi),
        totalRoi: dusdt(result.totalRoi),
      },
      usedVoucher: result.usedVoucher,
      message: result.usedVoucher ? 'Investimento criado com saldo de voucher!' : 'Investimento criado com sucesso!',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
