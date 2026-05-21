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

    // Deposits with user info (with individual error handling)
    if (section === 'all' || section === 'deposits') {
      try {
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
      } catch (e) {
        console.error('NP deposits error:', e);
        result.deposits = [];
        result.depositPagination = { page, limit, total: 0, totalPages: 0 };
      }
    }

    // Payouts with user info
    if (section === 'all' || section === 'payouts') {
      try {
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
      } catch (e) {
        console.error('NP payouts error:', e);
        result.payouts = [];
        result.payoutPagination = { page, limit, total: 0, totalPages: 0 };
      }
    }

    // Sub-accounts (wallets)
    if (section === 'all' || section === 'wallets') {
      try {
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
      } catch (e) {
        console.error('NP wallets error:', e);
        result.wallets = [];
        result.walletPagination = { page, limit, total: 0, totalPages: 0 };
      }
    }

    // Webhook logs
    if (section === 'all' || section === 'webhooks') {
      try {
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
      } catch (e) {
        console.error('NP webhooks error:', e);
        result.webhooks = [];
        result.webhookPagination = { page, limit, total: 0, totalPages: 0 };
      }
    }

    // Stats
    if (section === 'all' || section === 'stats') {
      try {
        const [
          totalDeposits,
          totalPayouts,
          pendingDeposits,
          pendingPayouts,
          totalSplit,
          totalDepositRecords,
          totalPayoutRecords,
          totalSubAccounts,
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
          db.nowPaymentsDeposit.aggregate({ _sum: { splitTotalAmount: true } }),
          db.nowPaymentsDeposit.count(),
          db.nowPaymentsPayout.count(),
          db.nowPaymentsSubAccount.count(),
        ]);

        result.stats = {
          totalDeposited: d(totalDeposits._sum.priceAmount || '0'),
          totalPaidOut: d(totalPayouts._sum.amount || '0'),
          pendingDepositCount: pendingDeposits,
          pendingPayoutCount: pendingPayouts,
          totalSplitReceived: d(totalSplit._sum.splitTotalAmount || '0'),
          totalDepositRecords,
          totalPayoutRecords,
          totalSubAccounts,
        };
      } catch (e) {
        console.error('NP stats error:', e);
        result.stats = {
          totalDeposited: 0,
          totalPaidOut: 0,
          pendingDepositCount: 0,
          pendingPayoutCount: 0,
          totalSplitReceived: 0,
          totalDepositRecords: 0,
          totalPayoutRecords: 0,
          totalSubAccounts: 0,
        };
      }
    }

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
