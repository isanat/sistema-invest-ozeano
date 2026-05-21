import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { withdrawalSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

// ============================================================================
// WITHDRAWAL ROUTE — Abordagem B (Bloqueio por Origem)
// ============================================================================
// Regras:
// - balance: depósitos próprios + lucros próprios = SEMPRE sacável
// - balance: lucros de voucher = bloqueado conforme unlockPct do voucher
// - voucherBalance: NUNCA sacável como dinheiro
// - affiliateBalance: SEMPRE sacável, independente de voucher
//
// Fórmula: maxWithdrawable = ownSourceInBalance + (voucherProfitsInBalance × unlockPct / 100)
// Sem voucher: maxWithdrawable = balance (tudo liberado)
// ============================================================================

/**
 * Calculate withdrawal breakdown for a user (Abordagem B — origin-based locking)
 * Used by both the withdrawal route and the breakdown endpoint
 */
export async function calculateWithdrawalBreakdown(userId: string) {
  // Get user data
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new BusinessError('Usuário não encontrado', 404);

  const currentBalance = d(user.balance);
  const totalDeposited = d(user.totalDeposited);
  const totalWithdrawn = d(user.totalWithdrawn);

  // Include pending withdrawals to prevent voucher lock bypass
  const pendingWithdrawals = await db.deposit.aggregate({
    where: {
      userId,
      type: 'withdrawal',
      status: { in: ['pending', 'confirmed'] },
    },
    _sum: { amount: true },
  });
  const effectiveTotalWithdrawn = totalWithdrawn + d(pendingWithdrawals._sum.amount || '0');

  // Check for active vouchers
  const activeVouchers = await db.voucher.findMany({
    where: { userId, status: 'active' },
  });

  // If no active vouchers → everything is withdrawable
  if (activeVouchers.length === 0) {
    return {
      balance: currentBalance,
      ownSource: currentBalance, // All balance is own source when no voucher
      voucherProfits: 0,
      unlockPct: 100,
      maxWithdrawable: currentBalance,
      hasActiveVoucher: false,
    };
  }

  // Get the highest unlock percentage from active vouchers (most permissive)
  const maxUnlockPct = Math.max(...activeVouchers.map(v => d(v.withdrawalUnlockPct)), 0);

  // Calculate total invested from own balance (source='deposit')
  const ownInvestmentsResult = await db.investment.aggregate({
    where: { userId, source: 'deposit' },
    _sum: { amount: true },
  });
  const totalInvestedFromBalance = d(ownInvestmentsResult._sum.amount);

  // Calculate profits by source
  // Own profits: ROI from investments with source='deposit'
  const depositInvestmentIds = (await db.investment.findMany({
    where: { userId, source: 'deposit' },
    select: { id: true },
  })).map(i => i.id);

  const voucherInvestmentIds = (await db.investment.findMany({
    where: { userId, source: 'voucher' },
    select: { id: true },
  })).map(i => i.id);

  let totalOwnProfits = 0;
  let totalVoucherProfits = 0;

  if (depositInvestmentIds.length > 0) {
    const ownProfitsResult = await db.roiHistory.aggregate({
      where: { userId, investmentId: { in: depositInvestmentIds } },
      _sum: { totalRoi: true },
    });
    totalOwnProfits = d(ownProfitsResult._sum.totalRoi);
  }

  if (voucherInvestmentIds.length > 0) {
    const voucherProfitsResult = await db.roiHistory.aggregate({
      where: { userId, investmentId: { in: voucherInvestmentIds } },
      _sum: { totalRoi: true },
    });
    totalVoucherProfits = d(voucherProfitsResult._sum.totalRoi);
  }

  // Calculate own sources in balance using FIFO:
  // Withdrawals first consume own sources, then voucher profits
  const ownSourceTotal = totalDeposited + totalOwnProfits - totalInvestedFromBalance;
  const ownSourceInBalance = Math.max(0, ownSourceTotal - effectiveTotalWithdrawn);

  // Voucher profits in balance (FIFO: withdrawals consume own sources first)
  const voucherProfitsWithdrawn = Math.max(0, effectiveTotalWithdrawn - Math.max(0, ownSourceTotal));
  const voucherProfitsInBalance = Math.max(0, totalVoucherProfits - voucherProfitsWithdrawn);

  // Calculate max withdrawable
  const maxWithdrawable = Math.min(
    ownSourceInBalance + (voucherProfitsInBalance * maxUnlockPct / 100),
    currentBalance
  );

  return {
    balance: currentBalance,
    ownSource: ownSourceInBalance,
    voucherProfits: voucherProfitsInBalance,
    unlockPct: maxUnlockPct,
    maxWithdrawable: Math.max(0, maxWithdrawable),
    hasActiveVoucher: true,
    // Detailed breakdown for debugging/admin
    _debug: {
      totalDeposited,
      totalWithdrawn,
      effectiveTotalWithdrawn,
      totalInvestedFromBalance,
      totalOwnProfits,
      totalVoucherProfits,
      ownSourceTotal,
      voucherProfitsWithdrawn,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = withdrawalSchema.parse(body);

    // Validate withdrawal method against allowlist
    const VALID_WITHDRAWAL_METHODS = ['pix', 'usdt_trc20', 'usdt_polygon'];
    if (!VALID_WITHDRAWAL_METHODS.includes(data.method)) {
      return apiError('Método de saque inválido. Use: pix, usdt_trc20 ou usdt_polygon');
    }

    // Get withdrawal config — includes enable/disable toggles
    const configKeys = [
      'min_withdrawal_usdt', 'max_withdrawal_usdt', 'withdrawal_fee_pct',
      'manual_withdrawal_enabled', 'nowpayments_withdrawal_enabled',
      'withdrawal_interval_hours',
    ];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    // ========== WITHDRAWAL METHOD TOGGLE CHECK ==========
    const manualWithdrawalEnabled = configMap.manual_withdrawal_enabled === 'true';
    const nowpaymentsWithdrawalEnabled = configMap.nowpayments_withdrawal_enabled === 'true';

    // Check if the requested withdrawal method is enabled
    if (data.method === 'pix' || data.method === 'usdt_trc20') {
      // Manual withdrawal methods — check if manual withdrawal is enabled
      if (!manualWithdrawalEnabled && !nowpaymentsWithdrawalEnabled) {
        return apiError('Saques estão temporariamente desabilitados. Tente novamente mais tarde.');
      }
    }

    const minWithdrawal = d(configMap.min_withdrawal_usdt) || 10;
    const maxWithdrawal = d(configMap.max_withdrawal_usdt) || 50000;
    const feePct = d(configMap.withdrawal_fee_pct) || 0;

    if (data.amount < minWithdrawal) {
      return apiError(`Saque mínimo: ${dusdt(minWithdrawal)} USDT`);
    }

    if (data.amount > maxWithdrawal) {
      return apiError(`Saque máximo: ${dusdt(maxWithdrawal)} USDT`);
    }

    // ========== WITHDRAWAL INTERVAL CHECK ==========
    const intervalHours = d(configMap.withdrawal_interval_hours) || 0;
    if (intervalHours > 0) {
      const lastWithdrawal = await db.deposit.findFirst({
        where: {
          userId: session.userId,
          type: 'withdrawal',
          status: { in: ['pending', 'confirmed'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (lastWithdrawal) {
        const elapsed = (Date.now() - new Date(lastWithdrawal.createdAt).getTime()) / (1000 * 60 * 60);
        if (elapsed < intervalHours) {
          const remaining = Math.ceil(intervalHours - elapsed);
          return apiError(`Aguarde ${remaining}h antes de solicitar outro saque. Intervalo mínimo: ${intervalHours}h.`);
        }
      }
    }

    // ========== VOUCHER WITHDRAWAL LOCK CHECK (Abordagem B — por origem) ==========
    // Only blocks voucher-sourced profits. Own deposits + own profits are ALWAYS withdrawable.
    const breakdown = await calculateWithdrawalBreakdown(session.userId);

    if (data.amount > breakdown.maxWithdrawable) {
      if (breakdown.hasActiveVoucher) {
        return apiError(
          `Saque máximo disponível: ${dusdt(breakdown.maxWithdrawable)} USDT. ` +
          `Recursos próprios (depósitos + lucros próprios): ${dusdt(breakdown.ownSource)} USDT ✅ sempre liberado. ` +
          `Lucros de voucher: ${dusdt(breakdown.voucherProfits)} USDT ⚠️ desbloqueado: ${breakdown.unlockPct}%. ` +
          `Continue cumprindo as metas do voucher para desbloquear mais.`
        );
      }
      return apiError('Saldo insuficiente');
    }

    // Use transaction for atomicity - deduct balance immediately with row lock
    const result = await db.$transaction(async (tx) => {
      // PostgreSQL: acquire row-level lock to prevent concurrent balance modifications
      if (isPostgres()) {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
      }

      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error('User not found');

      const currentBalance = d(user.balance);

      if (currentBalance < data.amount) {
        throw new BusinessError('Saldo insuficiente');
      }

      // Calculate fee
      const fee = data.amount * (feePct / 100);
      const netAmount = data.amount - fee;

      // Deduct balance atomically using SQL (PostgreSQL)
      await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) - ${data.amount}) AS TEXT) WHERE id = ${session.userId} AND CAST(balance AS NUMERIC) >= ${data.amount}`;
      // Verify the deduction actually happened (balance was sufficient)
      const updatedUser = await tx.user.findUnique({ where: { id: session.userId } });
      if (d(updatedUser!.balance) === currentBalance) {
        throw new BusinessError('Saldo insuficiente');
      }

      // Get USDT/BRL rate
      const usdtBrlRate = await getUSDTBRLRate();
      const brlAmount = data.method === 'pix' ? data.amount * usdtBrlRate : null;

      // Create deposit record (withdrawal)
      const deposit = await tx.deposit.create({
        data: {
          userId: session.userId,
          amount: ds(data.amount),
          brlAmount: brlAmount ? ds(brlAmount) : null,
          usdtRate: ds(usdtBrlRate),
          type: 'withdrawal',
          method: data.method,
          network: data.method === 'usdt_trc20' ? 'TRC20' : data.method === 'usdt_polygon' ? 'Polygon' : null,
          status: 'pending',
          destination: data.destination,
          description: `Saque ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()} - ${dusdt(data.amount)} USDT${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          adminNotes: fee > 0 ? `Taxa: ${dusdt(fee)} USDT (${feePct}%). Valor líquido: ${dusdt(netAmount)} USDT` : null,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'withdrawal',
          amount: ds(data.amount),
          brlAmount: brlAmount ? ds(brlAmount) : null,
          usdtRate: ds(usdtBrlRate),
          status: 'pending',
          description: `Saque solicitado - ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()}${fee > 0 ? ` (taxa: ${dusdt(fee)} USDT)` : ''}`,
          referenceId: deposit.id,
          referenceType: 'Deposit',
        },
      });

      return { deposit, fee, netAmount };
    });

    return apiSuccess({
      withdrawal: result.deposit,
      fee: dusdt(result.fee),
      netAmount: dusdt(result.netAmount),
      message: 'Solicitação de saque criada. Aguarde o processamento.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
