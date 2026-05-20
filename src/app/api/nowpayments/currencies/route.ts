import { NextResponse } from 'next/server';
import { getAvailableCurrencies, getMerchantCoins, isNowPaymentsConfigured, CURRENCY_MAP, fromNowPaymentsCurrency } from '@/lib/nowpayments';
import { db } from '@/lib/db';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// STRICT: Only returns currencies that admin has explicitly configured in nowpayments_deposit_currencies
// Falls back to NowPayments API ONLY if admin has not configured specific currencies
export async function GET() {
  try {
    // Check if NowPayments is enabled — STRICT check (must be exactly "true")
    const configs = await db.systemConfig.findMany({
      where: { key: { in: ['nowpayments_enabled', 'has_pix', 'nowpayments_deposit_currencies'] } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const isNpEnabled = configMap.nowpayments_enabled === 'true';
    const pixEnabled = configMap.has_pix === 'true';
    const adminCurrencies = (configMap.nowpayments_deposit_currencies || '')
      .split(',')
      .map((c: string) => c.trim().toLowerCase())
      .filter(Boolean);

    if (!isNpEnabled) {
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled: false,
      });
    }

    // =========================================================================
    // PRIORITY 1: Admin-configured currencies (from nowpayments_deposit_currencies)
    // If the admin has set specific currencies, use ONLY those — no API fallback
    // =========================================================================
    if (adminCurrencies.length > 0) {
      // Map admin codes to deposit/withdrawal format
      const depositCurrencies = adminCurrencies.map(c => fromNowPaymentsCurrency(c) || c);
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
        currencies: adminCurrencies,
        deposit: depositCurrencies,
        withdrawal: pixEnabled ? [...withdrawalCurrencies, 'pix'] : withdrawalCurrencies,
        pixEnabled,
      });
    }

    // =========================================================================
    // PRIORITY 2: No admin config — try NowPayments API (merchant coins, then available)
    // This is a fallback for when admin hasn't configured specific currencies
    // =========================================================================
    const configured = await isNowPaymentsConfigured();

    if (!configured) {
      // NowPayments not configured - return empty (no fallback)
      return NextResponse.json({
        success: true,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        message: 'NowPayments not configured and no admin currencies set',
      });
    }

    // Try to get MERCHANT-CONFIGURED coins
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

    // Try available currencies as fallback
    let availableCurrencies: string[] = [];
    try {
      const result = await getAvailableCurrencies();
      availableCurrencies = (result.currencies || []).map((c: string) => c.toLowerCase());
    } catch (err) {
      console.warn('[/api/nowpayments/currencies] Failed to fetch available currencies:', err);
    }

    // Determine effective currencies from API
    const supportedNpCurrencies = Object.values(CURRENCY_MAP).map(c => c.toLowerCase());
    let effectiveCurrencies: string[] = [];

    if (merchantCoins.length > 0) {
      effectiveCurrencies = merchantCoins.filter(c => supportedNpCurrencies.includes(c));
    }

    if (effectiveCurrencies.length === 0 && availableCurrencies.length > 0) {
      effectiveCurrencies = availableCurrencies.filter(c => supportedNpCurrencies.includes(c));
    }

    // NO GENERIC FALLBACK — if nothing from API, return empty

    // Normalize back to CURRENCY_MAP casing
    const normalizedCurrencies = effectiveCurrencies.map(c => {
      const match = Object.entries(CURRENCY_MAP).find(([, v]) => v.toLowerCase() === c.toLowerCase());
      return match ? match[1] : c;
    });

    const depositCurrencies = normalizedCurrencies.map(c => fromNowPaymentsCurrency(c));
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
    return NextResponse.json({
      success: true,
      currencies: [],
      deposit: [],
      withdrawal: [],
      pixEnabled: false,
    });
  }
}
