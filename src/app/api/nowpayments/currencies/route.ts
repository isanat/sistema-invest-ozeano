import { NextResponse } from 'next/server';
import { getAvailableCurrencies, getMerchantCoins, isNowPaymentsConfigured, CURRENCY_MAP, fromNowPaymentsCurrency } from '@/lib/nowpayments';
import { db } from '@/lib/db';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns only the currencies that are CONFIGURED in the NowPayments merchant account
export async function GET() {
  try {
    // Check if NowPayments is enabled in system config
    const enabledConfig = await db.systemConfig.findUnique({
      where: { key: 'nowpayments_enabled' },
    });

    const isEnabled = enabledConfig?.value === 'true' || !enabledConfig;

    if (!isEnabled) {
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        message: 'NowPayments is disabled',
      });
    }

    const configured = await isNowPaymentsConfigured();

    if (!configured) {
      // Fallback to default currencies if NP not configured
      return NextResponse.json({
        success: true,
        currencies: ['usdttrc20', 'usdtmatic', 'btc', 'eth', 'trx'],
        deposit: ['usdttrc20', 'usdtmatic', 'btc', 'eth', 'trx'],
        withdrawal: ['usdt_trc20', 'usdt_polygon', 'btc'],
        pixEnabled: true,
      });
    }

    // =========================================================================
    // STEP 1: Try to get MERCHANT-CONFIGURED coins (only coins the merchant has enabled)
    // The /merchant/coins endpoint returns only currencies configured in the account
    // =========================================================================
    let merchantCoins: string[] = [];
    try {
      const merchantResult = await getMerchantCoins() as any;
      // The merchant/coins endpoint returns an array of coin objects or currency strings
      if (Array.isArray(merchantResult)) {
        // Each item may be a string or an object with currency/coin field
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
      console.log('[/api/nowpayments/currencies] Merchant coins from API:', merchantCoins);
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
    // STEP 3: Determine effective currencies
    // Priority: merchant coins > available currencies > our CURRENCY_MAP fallback
    // =========================================================================
    const supportedNpCurrencies = Object.values(CURRENCY_MAP).map(c => c.toLowerCase()); // NP format codes in lowercase

    let effectiveCurrencies: string[] = [];

    if (merchantCoins.length > 0) {
      // Filter merchant coins to only include currencies we support in our CURRENCY_MAP
      effectiveCurrencies = merchantCoins.filter(c => supportedNpCurrencies.includes(c));
      console.log('[/api/nowpayments/currencies] Filtered merchant coins (in CURRENCY_MAP):', effectiveCurrencies);
    }

    // If merchant coins API returned nothing useful, try available currencies
    if (effectiveCurrencies.length === 0 && availableCurrencies.length > 0) {
      effectiveCurrencies = availableCurrencies.filter(c => supportedNpCurrencies.includes(c));
      console.log('[/api/nowpayments/currencies] Using available currencies (filtered):', effectiveCurrencies);
    }

    // Last resort fallback: use all supported currencies
    if (effectiveCurrencies.length === 0) {
      effectiveCurrencies = supportedNpCurrencies;
      console.log('[/api/nowpayments/currencies] Using fallback (all CURRENCY_MAP):', effectiveCurrencies);
    }

    // Normalize back to the original casing in CURRENCY_MAP
    const normalizedCurrencies = effectiveCurrencies.map(c => {
      const match = Object.entries(CURRENCY_MAP).find(([, v]) => v.toLowerCase() === c.toLowerCase());
      return match ? match[1] : c;
    });

    // Map NP currency codes to our internal codes for deposit
    const depositCurrencies = normalizedCurrencies.map(c => fromNowPaymentsCurrency(c));

    // Withdrawal currencies (same as deposit, plus PIX option)
    const withdrawalCurrencies = depositCurrencies.map(c => {
      // Convert NP format to our internal format with underscores
      if (c === 'usdttrc20') return 'usdt_trc20';
      if (c === 'usdtmatic') return 'usdt_polygon';
      if (c === 'usdtbsc') return 'usdt_bsc';
      if (c === 'usdterc20') return 'usdt_erc20';
      if (c === 'usdcmatic') return 'usdc_polygon';
      return c;
    });

    // Check if PIX is enabled (from system config or env)
    const hasPixConfig = await db.systemConfig.findUnique({ where: { key: 'pix_enabled' } });
    const pixEnabled = hasPixConfig?.value !== 'false'; // default true

    return NextResponse.json({
      success: true,
      currencies: normalizedCurrencies,
      deposit: depositCurrencies,
      withdrawal: pixEnabled ? [...withdrawalCurrencies, 'pix'] : withdrawalCurrencies,
      pixEnabled,
      merchantCoinsCount: merchantCoins.length, // Debug info
    });
  } catch (error: any) {
    console.error('[/api/nowpayments/currencies] Error:', error?.message || error);
    // Graceful fallback
    return NextResponse.json({
      success: true,
      currencies: ['usdttrc20', 'usdtmatic', 'btc', 'eth', 'trx'],
      deposit: ['usdttrc20', 'usdtmatic', 'btc', 'eth', 'trx'],
      withdrawal: ['usdt_trc20', 'usdt_polygon', 'btc', 'pix'],
      pixEnabled: true,
    });
  }
}
