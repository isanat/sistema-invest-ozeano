import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  createSubPartnerAccount,
  createSubPartnerDeposit,
  toNowPaymentsCurrency,
  type SubPartnerDepositResponse,
} from '@/lib/nowpayments';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const currency = String(body.currency || 'usdttrc20');

    if (!isNowPaymentsConfigured()) {
      return apiError('NowPayments não está configurado', 503);
    }

    const npCurrency = toNowPaymentsCurrency(currency);

    // Ensure user has a NowPayments sub-account
    let subAccount = await db.nowPaymentsSubAccount.findUnique({
      where: { userId: session.userId },
    });

    if (!subAccount) {
      // Create sub-partner account in NowPayments
      let npUserId: string;
      try {
        const npAccount = await createSubPartnerAccount(`user_${session.userId}`);
        npUserId = String(npAccount.id);
      } catch (err) {
        console.error('[NowPayments GenerateAddress] Failed to create sub-account:', err);
        return apiError('Falha ao criar sub-conta NowPayments', 500);
      }

      // Create local record
      subAccount = await db.nowPaymentsSubAccount.create({
        data: {
          userId: session.userId,
          nowpaymentsUserId: npUserId,
        },
      });
    }

    // Check if address already exists for this currency
    const existingAddressField = currency === 'btc'
      ? 'depositAddressBtc'
      : currency === 'usdttrc20'
        ? 'depositAddressUsdt'
        : currency === 'usdt_polygon'
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

    // Generate deposit address using Sub-Partner API
    let depositResponse: SubPartnerDepositResponse;
    try {
      depositResponse = await createSubPartnerDeposit({
        user_id: subAccount.nowpaymentsUserId,
        currency: npCurrency,
      });
    } catch (err) {
      console.error('[NowPayments GenerateAddress] Failed to generate address:', err);
      return apiError('Falha ao gerar endereço de depósito', 500);
    }

    // Store address in sub-account record
    const addressUpdate: Record<string, string> = {};
    if (currency === 'btc') {
      addressUpdate.depositAddressBtc = depositResponse.address;
    } else if (currency === 'usdt_trc20' || currency === 'usdttrc20') {
      addressUpdate.depositAddressUsdt = depositResponse.address;
    } else if (currency === 'usdt_polygon' || currency === 'usdtmatic') {
      addressUpdate.depositAddressUsdtPolygon = depositResponse.address;
    }

    if (Object.keys(addressUpdate).length > 0) {
      await db.nowPaymentsSubAccount.update({
        where: { id: subAccount.id },
        data: addressUpdate,
      });
    }

    return apiSuccess({
      address: depositResponse.address,
      currency: depositResponse.currency || npCurrency,
      cached: false,
      message: 'Endereço de depósito gerado com sucesso',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
