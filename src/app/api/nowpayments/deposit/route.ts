import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  createPayment,
  createSubPartnerAccount,
  toNowPaymentsCurrency,
  type PaymentResponse,
} from '@/lib/nowpayments';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const amount = Number(body.amount);
    const payCurrency = String(body.pay_currency || 'usdttrc20');

    if (!amount || amount <= 0) {
      return apiError('Valor deve ser positivo');
    }

    // Get deposit limits from SystemConfig
    const configKeys = [
      'min_deposit_usdt',
      'max_deposit_usdt',
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const minDeposit = d(configMap.min_deposit_usdt) || 10;
    const maxDeposit = d(configMap.max_deposit_usdt) || 100000;

    if (amount < minDeposit) {
      return apiError(`Depósito mínimo: ${dusdt(minDeposit)} USDT`);
    }
    if (amount > maxDeposit) {
      return apiError(`Depósito máximo: ${dusdt(maxDeposit)} USDT`);
    }

    // Check if NowPayments is configured
    const npConfigured = isNowPaymentsConfigured();

    let payment: PaymentResponse | null = null;
    let depositAddress: string | null = null;

    if (npConfigured) {
      // Ensure user has a NowPayments sub-account
      let subAccount = await db.nowPaymentsSubAccount.findUnique({
        where: { userId: session.userId },
      });

      if (!subAccount) {
        try {
          const npAccount = await createSubPartnerAccount(`user_${session.userId}`);
          subAccount = await db.nowPaymentsSubAccount.create({
            data: {
              userId: session.userId,
              nowpaymentsUserId: String(npAccount.result.id),
            },
          });
        } catch (err) {
          console.error('[NowPayments] Failed to create sub-account:', err);
          // Fall through to direct payment
        }
      }

      // Create NowPayments payment to generate deposit address
      const orderId = `deposit_${session.userId}_${Date.now()}`;
      try {
        payment = await createPayment({
          price_amount: amount,
          price_currency: 'usd',
          pay_currency: toNowPaymentsCurrency(payCurrency),
          order_id: orderId,
          order_description: `FlashMining Deposit - ${amount} USDT`,
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
        });
        depositAddress = payment.pay_address;
      } catch (err) {
        console.error('[NowPayments] Failed to create payment:', err);
        // Continue without payment - will create pending deposit
      }
    }

    // Create NowPaymentsDeposit record
    const depositRecord = await db.nowPaymentsDeposit.create({
      data: {
        userId: session.userId,
        nowpaymentsPaymentId: payment?.payment_id ? String(payment.payment_id) : null,
        orderId: payment?.order_id || `deposit_${session.userId}_${Date.now()}`,
        priceAmount: ds(amount),
        priceCurrency: 'usd',
        payAmount: payment?.pay_amount ? ds(payment.pay_amount) : null,
        payCurrency: toNowPaymentsCurrency(payCurrency),
        payAddress: depositAddress,
        paymentStatus: payment?.payment_status || 'waiting',
        splitPct: ds(d(configMap.nowpayments_split_pct) || 0),
        purchaseId: payment?.purchase_id || null,
        expiresAt: payment?.expiration_estimate_date
          ? new Date(payment.expiration_estimate_date)
          : null,
      },
    });

    // Create Investment record (pending)
    const investment = await db.investment.create({
      data: {
        userId: session.userId,
        amount: ds(amount),
        type: 'deposit',
        method: payCurrency,
        network: payCurrency === 'usdttrc20' ? 'TRC20' : payCurrency === 'usdtmatic' ? 'Polygon' : null,
        status: 'pending',
        txHash: payment?.payment_id ? `nowpayments_${payment.payment_id}` : null,
        description: `Depósito NowPayments ${payCurrency.toUpperCase()} - ${dusdt(amount)} USDT`,
      },
    });

    // Link deposit to investment
    await db.nowPaymentsDeposit.update({
      where: { id: depositRecord.id },
      data: { investmentId: investment.id },
    });

    return apiSuccess({
      deposit: depositRecord,
      investment,
      paymentInfo: {
        depositAddress,
        payCurrency: toNowPaymentsCurrency(payCurrency),
        payAmount: payment?.pay_amount || null,
        paymentId: payment?.payment_id || null,
        paymentStatus: payment?.payment_status || 'waiting',
        expirationDate: payment?.expiration_estimate_date || null,
      },
      message: npConfigured && depositAddress
        ? 'Endereço de depósito gerado. Envie o pagamento para o endereço acima.'
        : 'Depósito registrado. Aguarde a confirmação manual.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
