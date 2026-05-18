import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  createPayment,
  getMinimumPaymentAmount,
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
    const npConfigured = await isNowPaymentsConfigured();

    if (!npConfigured) {
      return apiError('NowPayments não está configurado. Entre em contato com o suporte.', 503);
    }

    // Check NowPayments minimum amount for this currency
    const npCurrency = toNowPaymentsCurrency(payCurrency);
    let npMinAmount = 0;
    try {
      const minResult = await getMinimumPaymentAmount('usd', npCurrency);
      npMinAmount = minResult.min_amount || 0;
    } catch (err) {
      console.warn('[NowPayments Deposit] Could not fetch minimum amount:', err);
    }

    if (npMinAmount > 0 && amount < npMinAmount) {
      return apiError(`Valor mínimo para ${payCurrency.toUpperCase()}: ${npMinAmount.toFixed(2)} USDT. Aumente o valor do depósito.`);
    }

    let payment: PaymentResponse | null = null;
    let depositAddress: string | null = null;
    let paymentError: string | null = null;

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
        // Continue to direct payment - sub-account is optional
      }
    }

    // Create NowPayments payment to generate deposit address
    const orderId = `deposit_${session.userId}_${Date.now()}`;
    try {
      payment = await createPayment({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: npCurrency,
        order_id: orderId,
        order_description: `FlashMining Deposit - ${amount} USDT`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
      });
      depositAddress = payment.pay_address;
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[NowPayments] Failed to create payment:', errMsg);

      // Parse NowPayments error for user-friendly message
      if (errMsg.includes('AMOUNT_MINIMAL_ERROR')) {
        paymentError = `Valor abaixo do mínimo exigido pela NowPayments para ${payCurrency.toUpperCase()}. Tente um valor maior (mínimo ~${npMinAmount > 0 ? npMinAmount.toFixed(2) : '20'} USDT).`;
      } else if (errMsg.includes('INVALID_API_KEY')) {
        paymentError = 'Chave de API NowPayments inválida. Contate o suporte.';
      } else if (errMsg.includes('currency') || errMsg.includes('CURRENCY')) {
        paymentError = `Moeda ${payCurrency.toUpperCase()} não suportada. Tente USDT TRC20.`;
      } else {
        paymentError = `Erro ao gerar endereço de depósito: ${errMsg}. Tente novamente ou use depósito manual.`;
      }

      // Return error to user instead of silently creating a pending deposit without address
      return apiError(paymentError, 400);
    }

    if (!depositAddress) {
      return apiError('Não foi possível gerar o endereço de depósito. Tente novamente.', 500);
    }

    // Create NowPaymentsDeposit record
    const depositRecord = await db.nowPaymentsDeposit.create({
      data: {
        userId: session.userId,
        nowpaymentsPaymentId: payment?.payment_id ? String(payment.payment_id) : null,
        orderId: payment?.order_id || orderId,
        priceAmount: ds(amount),
        priceCurrency: 'usd',
        payAmount: payment?.pay_amount ? ds(payment.pay_amount) : null,
        payCurrency: npCurrency,
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

    // Calculate estimated fee
    let estimatedFee = 0;
    if (payment?.pay_amount && payment?.price_amount) {
      // NowPayments fee is embedded in the conversion - typically ~0.5%
      estimatedFee = 0.5;
    }

    return apiSuccess({
      depositId: depositRecord.id,
      deposit: depositRecord,
      investment,
      paymentInfo: {
        depositAddress,
        payCurrency: npCurrency,
        payAmount: payment?.pay_amount || null,
        priceAmount: amount,
        paymentId: payment?.payment_id || null,
        paymentStatus: payment?.payment_status || 'waiting',
        expirationDate: payment?.expiration_estimate_date || null,
        estimatedFee,
        network: payCurrency === 'usdttrc20' ? 'TRC20' :
                payCurrency === 'usdtmatic' ? 'Polygon' :
                payCurrency === 'btc' ? 'Bitcoin' :
                payCurrency === 'eth' ? 'Ethereum' :
                payCurrency === 'trx' ? 'TRON' :
                payCurrency.toUpperCase(),
      },
      message: 'Endereço de depósito gerado com sucesso! Envie o pagamento para o endereço abaixo.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
