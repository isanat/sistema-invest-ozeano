import { NextRequest, NextResponse } from 'next/server';
import { db, isPostgres } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, BusinessError } from '@/lib/api-utils';
import { z } from 'zod/v4';

const transferSchema = z.object({
  recipientEmail: z.email('E-mail do destinatário inválido'),
  amount: z.number().positive('Valor deve ser positivo'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = transferSchema.parse(body);

    const { recipientEmail, amount } = data;
    const senderId = session.userId;

    // 1. Check if transfers are enabled
    const transferEnabled = await db.systemConfig.findUnique({ where: { key: 'transfer_enabled' } });
    if (!transferEnabled || transferEnabled.value !== 'true') {
      throw new BusinessError('Transferências entre contas estão desativadas no momento.', 403);
    }

    // 2. Get transfer config
    const configKeys = [
      'min_transfer_usdt',
      'max_transfer_usdt',
      'transfer_fee_pct',
      'transfer_daily_limit',
      'transfer_cooldown_minutes',
    ];
    const configs = await db.systemConfig.findMany({ where: { key: { in: configKeys } } });
    const cfg = Object.fromEntries(configs.map(c => [c.key, c.value]));

    const minTransfer = parseFloat(cfg.min_transfer_usdt || '5');
    const maxTransfer = parseFloat(cfg.max_transfer_usdt || '0');
    const feePct = parseFloat(cfg.transfer_fee_pct || '1');
    const dailyLimit = parseInt(cfg.transfer_daily_limit || '5');
    const cooldownMinutes = parseInt(cfg.transfer_cooldown_minutes || '30');

    // 3. Validate amount
    if (amount < minTransfer) {
      throw new BusinessError(`Valor mínimo para transferência: $${minTransfer.toFixed(2)} USDT`);
    }
    if (maxTransfer > 0 && amount > maxTransfer) {
      throw new BusinessError(`Valor máximo para transferência: $${maxTransfer.toFixed(2)} USDT`);
    }

    // 4. Find recipient
    const recipient = await db.user.findUnique({
      where: { email: recipientEmail.toLowerCase().trim() },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!recipient) {
      throw new BusinessError('Destinatário não encontrado. Verifique o e-mail informado.');
    }
    if (!recipient.isActive) {
      throw new BusinessError('A conta do destinatário está desativada.');
    }
    if (recipient.id === senderId) {
      throw new BusinessError('Você não pode transferir para si mesmo.');
    }

    // 5. Check cooldown
    if (cooldownMinutes > 0) {
      const lastTransfer = await db.transaction.findFirst({
        where: {
          userId: senderId,
          type: 'transfer_sent',
          createdAt: { gte: new Date(Date.now() - cooldownMinutes * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (lastTransfer) {
        const waitMinutes = Math.ceil(
          (cooldownMinutes * 60 * 1000 - (Date.now() - new Date(lastTransfer.createdAt).getTime())) / 60000
        );
        throw new BusinessError(`Aguarde ${waitMinutes} minuto(s) antes de fazer outra transferência.`);
      }
    }

    // 6. Check daily limit
    if (dailyLimit > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTransfers = await db.transaction.count({
        where: {
          userId: senderId,
          type: 'transfer_sent',
          createdAt: { gte: todayStart },
        },
      });
      if (todayTransfers >= dailyLimit) {
        throw new BusinessError(`Limite diário de ${dailyLimit} transferência(ões) atingido.`);
      }
    }

    // 7. Calculate fee
    const fee = parseFloat((amount * feePct / 100).toFixed(2));
    const totalDeducted = amount + fee;
    const recipientReceives = amount; // Recipient gets full amount, fee goes to system

    // 8. Execute transfer atomically
    // FIX: Use $executeRaw tagged templates instead of $executeRawUnsafe to prevent SQL injection
    const result = await db.$transaction(async (tx) => {
      // Lock sender row (PostgreSQL only — SQLite transactions handle locking)
      let sender: Array<{ id: string; balance: string; hasInvested: boolean; isActive: boolean }>;
      if (isPostgres()) {
        sender = await tx.$queryRaw<Array<{ id: string; balance: string; hasInvested: boolean; isActive: boolean }>>`SELECT id, balance, "hasInvested", "isActive" FROM "User" WHERE id = ${senderId} FOR UPDATE`;
      } else {
        const senderRow = await tx.user.findUnique({ where: { id: senderId }, select: { id: true, balance: true, hasInvested: true, isActive: true } });
        sender = senderRow ? [senderRow] : [];
      }

      if (!sender[0]) throw new BusinessError('Remetente não encontrado.', 404);
      if (!sender[0].isActive) throw new BusinessError('Sua conta está desativada.', 403);
      if (!sender[0].hasInvested) throw new BusinessError('Apenas usuários que já investiram podem fazer transferências.', 403);

      const senderBalance = parseFloat(sender[0].balance);
      if (senderBalance < totalDeducted) {
        throw new BusinessError(`Saldo insuficiente. Você tem $${senderBalance.toFixed(2)} USDT e precisa de $${totalDeducted.toFixed(2)} (valor + taxa de ${feePct}%).`);
      }

      // Lock recipient row (PostgreSQL only)
      let recipientRow: Array<{ id: string; balance: string; isActive: boolean }>;
      if (isPostgres()) {
        recipientRow = await tx.$queryRaw<Array<{ id: string; balance: string; isActive: boolean }>>`SELECT id, balance, "isActive" FROM "User" WHERE id = ${recipient.id} FOR UPDATE`;
      } else {
        const rr = await tx.user.findUnique({ where: { id: recipient.id }, select: { id: true, balance: true, isActive: true } });
        recipientRow = rr ? [rr] : [];
      }

      if (!recipientRow[0] || !recipientRow[0].isActive) {
        throw new BusinessError('A conta do destinatário não está disponível.');
      }

      // Deduct from sender — using safe tagged template (FIX: was $executeRawUnsafe with string interpolation)
      const senderUpdateResult = await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) - ${totalDeducted}) AS TEXT) WHERE id = ${senderId} AND CAST(balance AS NUMERIC) >= ${totalDeducted}`;

      // Verify sender deduction
      if (isPostgres()) {
        // For PostgreSQL, check affected rows count
        if (senderUpdateResult === 0) {
          throw new BusinessError('Erro na dedução do saldo. Transferência cancelada.');
        }
      } else {
        // For SQLite, verify by re-reading
        const senderAfter = await tx.user.findUnique({ where: { id: senderId }, select: { balance: true } });
        if (!senderAfter || Math.abs(parseFloat(senderAfter.balance) - (senderBalance - totalDeducted)) > 0.001) {
          throw new BusinessError('Erro na dedução do saldo. Transferência cancelada.');
        }
      }

      // Credit to recipient — using safe tagged template (FIX: was $executeRawUnsafe)
      await tx.$executeRaw`UPDATE "User" SET balance = CAST((CAST(balance AS NUMERIC) + ${recipientReceives}) AS TEXT) WHERE id = ${recipient.id}`;

      // Create sender transaction
      const senderTx = await tx.transaction.create({
        data: {
          userId: senderId,
          type: 'transfer_sent',
          amount: totalDeducted.toString(),
          status: 'completed',
          description: `Transferência para ${recipient.name || recipient.email} — $${amount.toFixed(2)} + taxa $${fee.toFixed(2)}`,
          referenceId: recipient.id,
          referenceType: 'User',
        },
      });

      // Create recipient transaction
      const recipientTx = await tx.transaction.create({
        data: {
          userId: recipient.id,
          type: 'transfer_received',
          amount: recipientReceives.toString(),
          status: 'completed',
          description: `Transferência recebida de ${session.name || session.email} — $${recipientReceives.toFixed(2)}`,
          referenceId: senderId,
          referenceType: 'User',
        },
      });

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: senderId,
          action: 'transfer',
          entity: 'user',
          entityId: recipient.id,
          newValue: JSON.stringify({
            from: session.email,
            to: recipient.email,
            amount: amount,
            fee: fee,
            totalDeducted: totalDeducted,
          }),
          description: `Transferência interna: ${session.email} → ${recipient.email} — $${amount.toFixed(2)} (taxa: $${fee.toFixed(2)})`,
        },
      });

      return { senderTx, recipientTx };
    });

    return apiSuccess({
      message: `Transferência de $${amount.toFixed(2)} USDT para ${recipient.name || recipient.email} realizada com sucesso!`,
      transfer: {
        id: result.senderTx.id,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        amount: amount,
        fee: fee,
        totalDeducted: totalDeducted,
        createdAt: result.senderTx.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET — List user's transfer history
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const [transfers, total] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: session.userId,
          type: { in: ['transfer_sent', 'transfer_received'] },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({
        where: {
          userId: session.userId,
          type: { in: ['transfer_sent', 'transfer_received'] },
        },
      }),
    ]);

    return apiSuccess({
      transfers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
