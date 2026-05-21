import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMerchantCoins, isNowPaymentsConfigured, CURRENCY_LABELS, fromNowPaymentsCurrency } from '@/lib/nowpayments';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns currencies that the merchant has ENABLED in their NowPayments dashboard
// Flow: Frontend → GET /api/nowpayments/currencies → NowPayments API (GET /merchant/coins)
// The system queries the NowPayments account and returns ONLY the currencies the merchant accepts
// NO FALLBACK — if /merchant/coins fails, return empty (currencies must be configured by merchant)
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
    // Fetch currencies from NowPayments API — ONLY what the MERCHANT has enabled
    // Uses GET /merchant/coins — returns only coins the merchant accepts
    // NO FALLBACK to /currencies endpoint — merchant must configure their coins
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
      } else if (merchantResult?.coins && Array.isArray(merchantResult.coins)) {
        merchantCoins = merchantResult.coins.map((c: any) => {
          if (typeof c === 'string') return c.toLowerCase();
          return (c.currency || c.coin || c.code || '').toLowerCase();
        }).filter(Boolean);
      }
    } catch (err) {
      console.error('[/api/nowpayments/currencies] Failed to fetch merchant coins:', err);
      // NO FALLBACK — return empty if merchant coins cannot be fetched
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        error: 'Failed to fetch merchant coins from NowPayments',
      });
    }

    // Use ONLY merchant coins — these are the currencies the wallet owner has enabled
    // NO fallback to getAvailableCurrencies (which returns ALL NowPayments-supported currencies)
    const effectiveCurrencies = merchantCoins;

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
