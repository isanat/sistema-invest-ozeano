import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { apiSuccess, handleApiError, BusinessError, getIpFromRequest } from '@/lib/api-utils';
import { createPayout } from '@/lib/nowpayments';

// GET /api/admin/split-payout — List split payout history
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      db.splitLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipient: { select: { name: true, role: true, walletAddress: true } },
        },
      }),
      db.splitLog.count({ where }),
    ]);

    // Stats — NOTE: Can't use _sum because 'amount' is String, not numeric — sum in JS
    const accumulatedLogs = await db.splitLog.findMany({
      where: { status: 'accumulated' },
      select: { amount: true },
    });
    const paidLogs = await db.splitLog.findMany({
      where: { status: 'paid' },
      select: { amount: true },
    });

    return apiSuccess({
      logs,
      stats: {
        totalAccumulated: accumulatedLogs.reduce((sum, l) => sum + d(l.amount), 0),
        totalPaid: paidLogs.reduce((sum, l) => sum + d(l.amount), 0),
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/split-payout — Process payouts (auto or force)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { recipientId, force } = body;

    // If recipientId is provided, payout specific recipient
    // If not, auto-payout all recipients who meet threshold
    const recipients = recipientId
      ? [await db.splitRecipient.findUnique({ where: { id: recipientId } })]
      : await db.splitRecipient.findMany({
          where: {
            isActive: true,
            autoPayout: true,
          },
        });

    const results: Array<{
      recipientId: string;
      name: string;
      amount: number;
      status: string;
      error?: string;
    }> = [];

    for (const recipient of recipients) {
      if (!recipient) continue;

      const accumulated = d(recipient.accumulatedBalance);

      // Skip if below minimum (unless forced)
      if (!force && accumulated < d(recipient.minPayout)) {
        results.push({
          recipientId: recipient.id,
          name: recipient.name,
          amount: accumulated,
          status: 'skipped',
          error: `Abaixo do mínimo ($${d(recipient.minPayout)})`,
        });
        continue;
      }

      // Skip if nothing to pay
      if (accumulated <= 0) {
        results.push({
          recipientId: recipient.id,
          name: recipient.name,
          amount: 0,
          status: 'skipped',
          error: 'Saldo acumulado zerado',
        });
        continue;
      }

      try {
        // Attempt payout via NowPayments
        await createPayout([{
          address: recipient.walletAddress,
          currency: recipient.currency,
          amount: accumulated,
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
          payout_description: `Split payout - ${recipient.name} - ${recipient.percentage}%`,
        }], `Split payout for ${recipient.name}`);

        // Mark all accumulated logs as paid
        await db.$transaction(async (tx) => {
          // Update all accumulated logs for this recipient to 'paid'
          await tx.splitLog.updateMany({
            where: {
              recipientId: recipient.id,
              status: 'accumulated',
            },
            data: {
              status: 'paid',
              paidAt: new Date(),
            },
          });

          // Reset accumulated balance and add to totalSent
          await tx.splitRecipient.update({
            where: { id: recipient.id },
            data: {
              accumulatedBalance: '0',
              totalSent: ds(d(recipient.totalSent) + accumulated),
            },
          });
        });

        results.push({
          recipientId: recipient.id,
          name: recipient.name,
          amount: accumulated,
          status: 'paid',
        });
      } catch (payoutErr) {
        console.error(`[Split Payout] Failed for ${recipient.name}:`, payoutErr);
        results.push({
          recipientId: recipient.id,
          name: recipient.name,
          amount: accumulated,
          status: 'failed',
          error: payoutErr instanceof Error ? payoutErr.message : 'Payout failed',
        });
      }
    }

    // Admin log
    const paidCount = results.filter((r) => r.status === 'paid').length;
    const totalPaid = results
      .filter((r) => r.status === 'paid')
      .reduce((s, r) => s + r.amount, 0);

    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'payout',
        entity: 'split_recipient',
        description: `Split payout processado: ${paidCount} sócios, $${totalPaid.toFixed(2)} total${force ? ' (forçado)' : ''}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({
      results,
      summary: {
        processed: paidCount,
        totalPaid,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
      },
      message: `${paidCount} payout(s) processado(s) com sucesso`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
