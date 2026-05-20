import { NextResponse } from 'next/server';
import { getAvailableCurrencies, getMerchantCoins, isNowPaymentsConfigured, CURRENCY_MAP, fromNowPaymentsCurrency } from '@/lib/nowpayments';
import { db } from '@/lib/db';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns only the currencies that are CONFIGURED in the NowPayments merchant account
export async function GET() {
  try {
    // Check if NowPayments is enabled in system config
    const configs = await db.systemConfig.findMany({
      where: { key: { in: ['nowpayments_enabled', 'has_pix'] } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const isNpEnabled = configMap.nowpayments_enabled !== 'false'; // default true
    const pixEnabled = configMap.has_pix === 'true'; // default false

    if (!isNpEnabled) {
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled: false,
      });
    }

    const configured = await isNowPaymentsConfigured();

    if (!configured) {
      // NowPayments not configured - return empty (no fallback)
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        message: 'NowPayments not configured',
      });
    }

    // =========================================================================
    // STEP 1: Try to get MERCHANT-CONFIGURED coins (only coins the merchant has enabled)
    // =========================================================================
    let merchantCoins: string[] = [];
    try {
      const merchantResult = await getMerchantCoins() as any;
      if (Array.isArray(merchantResult)) {
        merchantCoins = merchantResult.map((item: any) => {
          if (typeof item === 'string') return item.toLowerCase();
          return (item.currency || item.coin || item.code || '').toLowerCase();
        }).filter(Boolean);
      } else if (merchantResult?.currencies && Array.isArray(merchantResult.currencies)) {
        merchantCoins = merchantResult.currencies.map((c: any) => {
          if (typeof c === 'string') return c.toLowerCase();
          return (c.currency || c.coin || c.code || '').toLowerCase();
        }).filter(Boolean);
      }
      console.log('[/api/nowpayments/currencies] Merchant coins from API:', merchantCoins.length);
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch merchant coins:', err);
    }

    // =========================================================================
    // STEP 2: Fallback - get all available currencies from /currencies endpoint
    // =========================================================================
    let availableCurrencies: string[] = [];
    try {
      const result = await getAvailableCurrencies();
      availableCurrencies = (result.currencies || []).map((c: string) => c.toLowerCase());
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch available currencies:', err);
    }

    // =========================================================================
    // STEP 3: Determine effective currencies - STRICT MODE
    // Priority: merchant coins > available currencies > EMPTY (no generic fallback)
    // =========================================================================
    const supportedNpCurrencies = Object.values(CURRENCY_MAP).map(c => c.toLowerCase());

    let effectiveCurrencies: string[] = [];

    if (merchantCoins.length > 0) {
      // Filter merchant coins to only include currencies we support in our CURRENCY_MAP
      effectiveCurrencies = merchantCoins.filter(c => supportedNpCurrencies.includes(c));
      console.log('[/api/nowpayments/currencies] Using merchant coins (filtered):', effectiveCurrencies.length);
    }

    // If merchant coins API returned nothing useful, try available currencies
    if (effectiveCurrencies.length === 0 && availableCurrencies.length > 0) {
      effectiveCurrencies = availableCurrencies.filter(c => supportedNpCurrencies.includes(c));
      console.log('[/api/nowpayments/currencies] Using available currencies (filtered):', effectiveCurrencies.length);
    }

    // NO MORE GENERIC FALLBACK - if nothing from NP API, return empty
    // The user must configure their NowPayments account properly

    // Normalize back to the original casing in CURRENCY_MAP
    const normalizedCurrencies = effectiveCurrencies.map(c => {
      const match = Object.entries(CURRENCY_MAP).find(([, v]) => v.toLowerCase() === c.toLowerCase());
      return match ? match[1] : c;
    });

    // Map NP currency codes to our internal codes for deposit
    const depositCurrencies = normalizedCurrencies.map(c => fromNowPaymentsCurrency(c));

    // Withdrawal currencies (same as deposit, plus PIX option if enabled)
    const withdrawalCurrencies = depositCurrencies.map(c => {
      if (c === 'usdttrc20') return 'usdt_trc20';
      if (c === 'usdtmatic') return 'usdt_polygon';
      if (c === 'usdtbsc') return 'usdt_bsc';
      if (c === 'usdterc20') return 'usdt_erc20';
      if (c === 'usdcmatic') return 'usdc_polygon';
      return c;
    });

    return NextResponse.json({
      success: true,
      currencies: normalizedCurrencies,
      deposit: depositCurrencies,
      withdrawal: pixEnabled ? [...withdrawalCurrencies, 'pix'] : withdrawalCurrencies,
      pixEnabled,
    });
  } catch (error: any) {
    console.error('[/api/nowpayments/currencies] Error:', error?.message || error);
    // Return empty on error - no fallback
    return NextResponse.json({
      success: true,
      currencies: [],
      deposit: [],
      withdrawal: [],
      pixEnabled: false,
    });
  }
}
