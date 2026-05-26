// ============================================================================
// INTERNAL TRANSFER API — User-to-user USDT transfers with anti-fraud
// ============================================================================
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { d, ds } from '@/lib/auth';
import { requireAuth, apiSuccess, handleApiError, BusinessError, sanitizePagination } from '@/lib/api-utils';

// Helper: get transfer config from SystemConfig
async function getTransferConfig() {
  const configs = await db.systemConfig.findMany({
    where: { key: { in: [
      'transfer_enabled', 'transfer_min', 'transfer_max',
      'transfer_fee_pct', 'transfer_daily_limit', 'transfer_cooldown_min',
    ] } },
  });
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;

  return {
    enabled: map.transfer_enabled === 'true',
    minAmount: d(map.transfer_min || '5'),
    maxAmount: d(map.transfer_max || '0'), // 0 = no limit
    feePct: d(map.transfer_fee_pct || '1'),
    dailyLimit: parseInt(map.transfer_daily_limit || '5'),
    cooldownMin: parseInt(map.transfer_cooldown_min || '30'),
  };
}

// GET /api/transfers — List user's transfer history + config
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    if (!userId) throw new BusinessError('Não autorizado', 401);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = sanitizePagination(
      searchParams.get('page') || '1',
      searchParams.get('limit') || '20'
    );

    const config = await getTransferConfig();

    // Get user info for balance + hasInvested check
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, hasInvested: true, isActive: true, name: true, email: true },
    });
    if (!user) throw new BusinessError('Usuário não encontrado');

    // Fetch transfers (both sent and received)
    const [transfers, total] = await Promise.all([
      db.transfer.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { name: true, email: true } },
          toUser: { select: { name: true, email: true } },
        },
      }),
      db.transfer.count({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        },
      }),
    ]);

    // Today's transfer count (for daily limit check)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db.transfer.count({
      where: {
        fromUserId: userId,
        createdAt: { gte: todayStart },
        status: 'completed',
      },
    });

    // Last transfer time (for cooldown)
    const lastTransfer = await db.transfer.findFirst({
      where: { fromUserId: userId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const cooldownRemaining = lastTransfer
      ? Math.max(0, config.cooldownMin * 60 * 1000 - (Date.now() - lastTransfer.createdAt.getTime()))
      : 0;

    return apiSuccess({
      config,
      user: {
        balance: d(user.balance),
        hasInvested: user.hasInvested,
        isActive: user.isActive,
        name: user.name,
        email: user.email,
      },
      transfers: transfers.map(t => ({
        id: t.id,
        direction: t.fromUserId === userId ? 'sent' : 'received',
        amount: d(t.amount),
        fee: d(t.fee),
        netAmount: d(t.netAmount),
        status: t.status,
        createdAt: t.createdAt,
        counterparty: t.fromUserId === userId
          ? { name: t.toUser.name, email: t.toUser.email }
          : { name: t.fromUser.name, email: t.fromUser.email },
      })),
      dailyLimit: { used: todayCount, max: config.dailyLimit },
      cooldownRemaining,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/transfers — Create a new transfer
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    if (!userId) throw new BusinessError('Não autorizado', 401);

    const body = await request.json();
    const { toEmail, amount } = body;

    // ─── VALIDATION ───────────────────────────────────────────────
    if (!toEmail || !amount) {
      throw new BusinessError('E-mail do destinatário e valor são obrigatórios');
    }

    const transferAmount = d(amount);
    if (transferAmount <= 0) {
      throw new BusinessError('Valor deve ser maior que zero');
    }

    // ─── GET CONFIG ───────────────────────────────────────────────
    const config = await getTransferConfig();

    // ─── CHECK: Transfer enabled by admin ─────────────────────────
    if (!config.enabled) {
      throw new BusinessError('Transferências estão desativadas pelo administrador');
    }

    // ─── CHECK: Sender is active ──────────────────────────────────
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, hasInvested: true, isActive: true, name: true, email: true },
    });
    if (!sender || !sender.isActive) {
      throw new BusinessError('Sua conta está inativa');
    }

    // ─── CHECK: Only investors can send ───────────────────────────
    if (!sender.hasInvested) {
      throw new BusinessError('Apenas investidores podem enviar transferências. Faça um investimento primeiro.');
    }

    // ─── CHECK: Minimum amount ────────────────────────────────────
    if (transferAmount < config.minAmount) {
      throw new BusinessError(`Valor mínimo para transferência é $${config.minAmount.toFixed(2)} USDT`);
    }

    // ─── CHECK: Maximum amount ────────────────────────────────────
    if (config.maxAmount > 0 && transferAmount > config.maxAmount) {
      throw new BusinessError(`Valor máximo para transferência é $${config.maxAmount.toFixed(2)} USDT`);
    }

    // ─── CHECK: Sufficient balance (amount + fee) ─────────────────
    const fee = transferAmount * (config.feePct / 100);
    const totalDebit = transferAmount + fee;
    const senderBalance = d(sender.balance);
    if (senderBalance < totalDebit) {
      throw new BusinessError(`Saldo insuficiente. Você tem $${senderBalance.toFixed(2)} USDT, mas precisa de $${totalDebit.toFixed(2)} (valor + taxa de ${config.feePct}%)`);
    }

    // ─── CHECK: Cannot transfer to self ───────────────────────────
    if (toEmail.toLowerCase() === sender.email.toLowerCase()) {
      throw new BusinessError('Não é possível transferir para você mesmo');
    }

    // ─── CHECK: Recipient exists ──────────────────────────────────
    const recipient = await db.user.findUnique({
      where: { email: toEmail.toLowerCase() },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!recipient) {
      throw new BusinessError('Destinatário não encontrado. Verifique o e-mail.');
    }
    if (!recipient.isActive) {
      throw new BusinessError('A conta do destinatário está inativa');
    }

    // ─── CHECK: Daily limit ───────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db.transfer.count({
      where: {
        fromUserId: userId,
        createdAt: { gte: todayStart },
        status: 'completed',
      },
    });
    if (todayCount >= config.dailyLimit) {
      throw new BusinessError(`Limite diário de ${config.dailyLimit} transferências atingido. Tente amanhã.`);
    }

    // ─── CHECK: Cooldown ──────────────────────────────────────────
    const lastTransfer = await db.transfer.findFirst({
      where: { fromUserId: userId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (lastTransfer) {
      const elapsed = Date.now() - lastTransfer.createdAt.getTime();
      const cooldownMs = config.cooldownMin * 60 * 1000;
      if (elapsed < cooldownMs) {
        const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000);
        throw new BusinessError(`Aguarde ${remainingMin} minuto(s) antes da próxima transferência (cooldown de ${config.cooldownMin} min)`);
      }
    }

    // ─── EXECUTE TRANSFER (atomic transaction) ────────────────────
    const netAmount = transferAmount - fee; // Recipient gets amount minus fee

    const transfer = await db.$transaction(async (tx) => {
      // Re-read sender balance inside transaction for consistency
      const senderLock = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!senderLock || d(senderLock.balance) < totalDebit) {
        throw new BusinessError('Saldo insuficiente (verificado no momento da transação)');
      }

      // Debit sender
      await tx.user.update({
        where: { id: userId },
        data: { balance: ds(d(senderLock.balance) - totalDebit) },
      });

      // Credit recipient (NOT totalDeposited — anti-fraud)
      const recipientLock = await tx.user.findUnique({
        where: { id: recipient.id },
        select: { balance: true },
      });
      await tx.user.update({
        where: { id: recipient.id },
        data: { balance: ds(d(recipientLock!.balance) + netAmount) },
      });

      // Create Transfer record
      const t = await tx.transfer.create({
        data: {
          fromUserId: userId,
          toUserId: recipient.id,
          amount: ds(transferAmount),
          fee: ds(fee),
          netAmount: ds(netAmount),
          status: 'completed',
        },
      });

      // Create Transaction records for both parties
      await tx.transaction.create({
        data: {
          userId: userId,
          type: 'transfer_sent',
          amount: ds(totalDebit),
          status: 'completed',
          description: `Transferência para ${recipient.name} (${recipient.email}) — $${transferAmount.toFixed(2)} + taxa $${fee.toFixed(2)}`,
          referenceId: t.id,
          referenceType: 'Transfer',
        },
      });

      await tx.transaction.create({
        data: {
          userId: recipient.id,
          type: 'transfer_received',
          amount: ds(netAmount),
          status: 'completed',
          description: `Transferência recebida de ${sender.name} (${sender.email}) — $${netAmount.toFixed(2)}`,
          referenceId: t.id,
          referenceType: 'Transfer',
        },
      });

      return t;
    });

    return apiSuccess({
      transfer: {
        id: transfer.id,
        amount: transferAmount,
        fee,
        netAmount,
        recipient: { name: recipient.name, email: recipient.email },
        status: 'completed',
        createdAt: transfer.createdAt,
      },
      message: `Transferência de $${transferAmount.toFixed(2)} USDT enviada com sucesso para ${recipient.name}!`,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
