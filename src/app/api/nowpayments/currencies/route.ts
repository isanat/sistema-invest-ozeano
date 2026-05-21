import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAvailableCurrencies, getMerchantCoins, isNowPaymentsConfigured, CURRENCY_MAP, CURRENCY_LABELS, fromNowPaymentsCurrency } from '@/lib/nowpayments';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns currencies that the merchant has ENABLED in their NowPayments dashboard
// Flow: Frontend → GET /api/nowpayments/currencies → NowPayments API (GET /merchant/coins)
// The system queries the NowPayments account and returns only the currencies the merchant accepts
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
    // Primary: GET /merchant/coins — returns only coins the merchant accepts
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
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch merchant coins:', err);
    }

    // If merchant coins are available, use ONLY those (what the wallet owner has enabled)
    // If not, try the broader available currencies as fallback
    let effectiveCurrencies: string[] = [];

    if (merchantCoins.length > 0) {
      // Use merchant coins directly — these are the currencies the wallet owner has enabled
      // We accept ALL merchant coins, not just ones in our CURRENCY_MAP
      effectiveCurrencies = merchantCoins;
    } else {
      // Fallback: try getAvailableCurrencies
      try {
        const result = await getAvailableCurrencies();
        const availableCurrencies = (result.currencies || []).map((c: string) => c.toLowerCase());
        if (availableCurrencies.length > 0) {
          effectiveCurrencies = availableCurrencies;
        }
      } catch (err) {
        console.warn('[/api/nowpayments/currencies] Failed to fetch available currencies:', err);
      }
    }

    // NO HARDCODED FALLBACK — if nothing from API, return empty

    // Build deposit and withdrawal currency lists
    // Map NowPayments codes to our internal codes where possible
    const depositCurrencies = effectiveCurrencies.map(c => fromNowPaymentsCurrency(c));
    const withdrawalCurrencies = depositCurrencies.map(c => {
      // Normalize internal currency codes for consistency
      if (c === 'usdttrc20') return 'usdt_trc20';
      if (c === 'usdtmatic') return 'usdt_polygon';
      if (c === 'usdtbsc') return 'usdt_bsc';
      if (c === 'usdterc20') return 'usdt_erc20';
      if (c === 'usdctrx') return 'usdc_trc20';
      if (c === 'usdcmatic') return 'usdc_polygon';
      if (c === 'usdcbsc') return 'usdc_bsc';
      if (c === 'usdcerc20') return 'usdc_erc20';
      if (c === 'daimatic') return 'dai_polygon';
      if (c === 'daierc20') return 'dai_erc20';
      if (c === 'bnbbsc') return 'bnb';
      return c;
    });

    // Build labels map for frontend use
    const labels: Record<string, string> = {};
    for (const c of [...depositCurrencies, ...withdrawalCurrencies]) {
      labels[c] = CURRENCY_LABELS[c] || c.toUpperCase().replace(/_/g, ' ');
    }

    return NextResponse.json({
      success: true,
      currencies: effectiveCurrencies,
      deposit: depositCurrencies,
      withdrawal: pixEnabled ? [...withdrawalCurrencies, 'pix'] : withdrawalCurrencies,
      pixEnabled,
      labels,
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
