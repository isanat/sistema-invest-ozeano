import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  createSubPartnerAccount,
  createSubPartnerDeposit,
  createPayment,
  toNowPaymentsCurrency,
  type SubPartnerDepositResponse,
  type PaymentResponse,
} from '@/lib/nowpayments';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const currency = String(body.currency || 'usdttrc20');

    if (!await isNowPaymentsConfigured()) {
      return apiError('NowPayments não está configurado', 503);
    }

    const npCurrency = toNowPaymentsCurrency(currency);

    // Ensure user has a NowPayments sub-account
    let subAccount = await db.nowPaymentsSubAccount.findUnique({
      where: { userId: session.userId },
    });

    if (!subAccount) {
      // Create sub-partner account in NowPayments using `name` parameter
      try {
        const npAccount = await createSubPartnerAccount(`user_${session.userId}`);
        const npUserData = npAccount.result;
        subAccount = await db.nowPaymentsSubAccount.create({
          data: {
            userId: session.userId,
            nowpaymentsUserId: String(npUserData.id),
          },
        });
      } catch (err) {
        console.error('[NowPayments GenerateAddress] Failed to create sub-account:', err);
        return apiError('Falha ao criar sub-conta NowPayments', 500);
      }
    }

    // Check if address already exists for this currency
    const existingAddressField = currency === 'btc'
      ? 'depositAddressBtc'
      : currency === 'usdt_trc20' || currency === 'usdttrc20'
        ? 'depositAddressUsdt'
        : currency === 'usdt_polygon' || currency === 'usdtmatic'
          ? 'depositAddressUsdtPolygon'
          : null;

    if (existingAddressField) {
      const existingAddress = subAccount[existingAddressField as keyof typeof subAccount] as string | null;
      if (existingAddress) {
        return apiSuccess({
          address: existingAddress,
          currency: npCurrency,
          cached: true,
          message: 'Endereço já existente para esta moeda',
        });
      }
    }

    // Try generating deposit address via Sub-Partner Deposit API first
    // This requires a Payment API key - will fallback to Payment API if it fails
    let depositAddress: string | null = null;
    let usedMethod = 'sub-partner';

    try {
      const depositResponse: SubPartnerDepositResponse = await createSubPartnerDeposit({
        sub_partner_id: subAccount.nowpaymentsUserId,
        currency: npCurrency,
      });
      depositAddress = depositResponse.result?.address || (depositResponse as unknown as { address: string }).address;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      console.warn('[NowPayments GenerateAddress] Sub-partner deposit failed:', errMsg);

      // Fallback: Use the standard Payment API to generate a deposit address
      // This creates a one-time payment with the generated address
      if (errMsg.includes('INVALID_API_KEY') || errMsg.includes('403')) {
        console.log('[NowPayments GenerateAddress] Trying fallback via Payment API...');
        usedMethod = 'payment';

        try {
          const payment: PaymentResponse = await createPayment({
            price_amount: 10, // Minimum amount placeholder - user will send whatever they want
            price_currency: 'usd',
            pay_currency: npCurrency,
            order_id: `addr_${session.userId}_${Date.now()}`,
            order_description: `Ozeano Invest deposit address generation`,
            ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/nowpayments/webhook`,
          });
          depositAddress = payment.pay_address;
        } catch (paymentErr) {
          console.error('[NowPayments GenerateAddress] Payment API also failed:', paymentErr);
          return apiError('Falha ao gerar endereço de depósito. Verifique as permissões da API key no painel NowPayments.', 500);
        }
      } else {
        return apiError('Falha ao gerar endereço de depósito', 500);
      }
    }

    if (!depositAddress) {
      return apiError('Falha ao gerar endereço de depósito', 500);
    }

    // Store address in sub-account record
    const addressUpdate: Record<string, string> = {};
    if (currency === 'btc') {
      addressUpdate.depositAddressBtc = depositAddress;
    } else if (currency === 'usdt_trc20' || currency === 'usdttrc20') {
      addressUpdate.depositAddressUsdt = depositAddress;
    } else if (currency === 'usdt_polygon' || currency === 'usdtmatic') {
      addressUpdate.depositAddressUsdtPolygon = depositAddress;
    }

    if (Object.keys(addressUpdate).length > 0) {
      await db.nowPaymentsSubAccount.update({
        where: { id: subAccount.id },
        data: addressUpdate,
      });
    }

    return apiSuccess({
      address: depositAddress,
      currency: npCurrency,
      cached: false,
      method: usedMethod,
      message: 'Endereço de depósito gerado com sucesso',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
