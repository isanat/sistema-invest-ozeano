import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAvailableCurrencies, getMerchantCoins, isNowPaymentsConfigured, CURRENCY_MAP, fromNowPaymentsCurrency } from '@/lib/nowpayments';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns currencies that the merchant has ENABLED in their NowPayments dashboard
// No hardcoded currencies, no admin manual list — fully dynamic from NowPayments API
export async function GET() {
  try {
    // Check if NowPayments is enabled
    const configs = await db.systemConfig.findMany({
      where: { key: { in: ['nowpayments_enabled', 'has_pix'] } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const isNpEnabled = configMap.nowpayments_enabled === 'true';
    const pixEnabled = configMap.has_pix === 'true';

    if (!isNpEnabled) {
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled: false,
      });
    }

    // Check if NowPayments is actually configured (env vars)
    const configured = isNowPaymentsConfigured();

    if (!configured) {
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        message: 'NowPayments credentials not configured in environment variables',
      });
    }

    // =========================================================================
    // Fetch currencies from NowPayments API — what the MERCHANT has enabled
    // =========================================================================

    // Priority 1: Get merchant-configured coins (these are what the wallet owner has enabled)
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
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch merchant coins:', err);
    }

    // Priority 2: Get available currencies as broader fallback
    let availableCurrencies: string[] = [];
    try {
      const result = await getAvailableCurrencies();
      availableCurrencies = (result.currencies || []).map((c: string) => c.toLowerCase());
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch available currencies:', err);
    }

    // Determine effective currencies from API
    // Use merchant coins if available (these are what the wallet owner has explicitly enabled)
    // Otherwise fall back to available currencies (what NowPayments supports generally)
    const supportedNpCurrencies = Object.values(CURRENCY_MAP).map(c => c.toLowerCase());
    let effectiveCurrencies: string[] = [];

    if (merchantCoins.length > 0) {
      // Filter to only include currencies our platform knows how to handle
      effectiveCurrencies = merchantCoins.filter(c => supportedNpCurrencies.includes(c));
    }

    if (effectiveCurrencies.length === 0 && availableCurrencies.length > 0) {
      // Fallback: filter available currencies to ones our platform supports
      effectiveCurrencies = availableCurrencies.filter(c => supportedNpCurrencies.includes(c));
    }

    // NO HARDCODED FALLBACK — if nothing from API, return empty

    // Normalize back to CURRENCY_MAP casing
    const normalizedCurrencies = effectiveCurrencies.map(c => {
      const match = Object.entries(CURRENCY_MAP).find(([, v]) => v.toLowerCase() === c.toLowerCase());
      return match ? match[1] : c;
    });

    // Build deposit and withdrawal currency lists
    const depositCurrencies = normalizedCurrencies.map(c => fromNowPaymentsCurrency(c));
    const withdrawalCurrencies = depositCurrencies.map(c => {
      // Normalize internal currency codes
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
    return NextResponse.json({
      success: true,
      currencies: [],
      deposit: [],
      withdrawal: [],
      pixEnabled: false,
    });
  }
}
