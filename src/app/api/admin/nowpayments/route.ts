import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const result: any = {};

    // Deposits with user info
    if (section === 'all' || section === 'deposits') {
      const [deposits, depositTotal] = await Promise.all([
        db.nowPaymentsDeposit.findMany({
          skip: section === 'all' ? 0 : skip,
          take: section === 'all' ? 50 : limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                walletAddress: true,
              },
            },
          },
        }),
        db.nowPaymentsDeposit.count(),
      ]);
      result.deposits = deposits;
      result.depositPagination = {
        page,
        limit,
        total: depositTotal,
        totalPages: Math.ceil(depositTotal / limit),
      };
    }

    // Payouts with user info
    if (section === 'all' || section === 'payouts') {
      const [payouts, payoutTotal] = await Promise.all([
        db.nowPaymentsPayout.findMany({
          skip: section === 'all' ? 0 : skip,
          take: section === 'all' ? 50 : limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                walletAddress: true,
              },
            },
          },
        }),
        db.nowPaymentsPayout.count(),
      ]);
      result.payouts = payouts;
      result.payoutPagination = {
        page,
        limit,
        total: payoutTotal,
        totalPages: Math.ceil(payoutTotal / limit),
      };
    }

    // Sub-accounts (wallets)
    if (section === 'all' || section === 'wallets') {
      const [subAccounts, walletTotal] = await Promise.all([
        db.nowPaymentsSubAccount.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                balance: true,
                totalInvested: true,
              },
            },
          },
        }),
        db.nowPaymentsSubAccount.count(),
      ]);
      result.wallets = subAccounts;
      result.walletPagination = {
        page,
        limit,
        total: walletTotal,
        totalPages: Math.ceil(walletTotal / limit),
      };
    }

    // Webhook logs
    if (section === 'all' || section === 'webhooks') {
      const [webhooks, webhookTotal] = await Promise.all([
        db.nowPaymentsWebhookLog.findMany({
          take: section === 'all' ? 50 : limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.nowPaymentsWebhookLog.count(),
      ]);
      result.webhooks = webhooks;
      result.webhookPagination = {
        page,
        limit,
        total: webhookTotal,
        totalPages: Math.ceil(webhookTotal / limit),
      };
    }

    // Stats
    if (section === 'all' || section === 'stats') {
      const [
        totalDeposits,
        totalPayouts,
        pendingDeposits,
        pendingPayouts,
        totalSplit,
      ] = await Promise.all([
        db.nowPaymentsDeposit.aggregate({ _sum: { priceAmount: true } }),
        db.nowPaymentsPayout.aggregate({ _sum: { amount: true } }),
        db.nowPaymentsDeposit.count({
          where: {
            paymentStatus: { in: ['waiting', 'confirming', 'confirmed'] },
          },
        }),
        db.nowPaymentsPayout.count({
          where: {
            payoutStatus: {
              in: ['CREATED', 'WAITING', 'PROCESSING', 'SENDING'],
            },
          },
        }),
        db.nowPaymentsDeposit.aggregate({ _sum: { splitAmount: true } }),
      ]);

      result.stats = {
        totalDeposited: d(totalDeposits._sum.priceAmount || '0'),
        totalPaidOut: d(totalPayouts._sum.amount || '0'),
        pendingDepositCount: pendingDeposits,
        pendingPayoutCount: pendingPayouts,
        totalSplitReceived: d(totalSplit._sum.splitAmount || '0'),
        totalDepositRecords: await db.nowPaymentsDeposit.count(),
        totalPayoutRecords: await db.nowPaymentsPayout.count(),
        totalSubAccounts: await db.nowPaymentsSubAccount.count(),
      };
    }

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
