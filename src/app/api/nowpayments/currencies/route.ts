import { NextResponse } from 'next/server';
import { getAvailableCurrencies, isNowPaymentsConfigured, CURRENCY_MAP, fromNowPaymentsCurrency } from '@/lib/nowpayments';
import { db } from '@/lib/db';

// GET /api/nowpayments/currencies — Public endpoint for user-facing currency selection
// Returns only the currencies that are available in the NowPayments account
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

    // Fetch available currencies from NowPayments API
    let availableCurrencies: string[] = [];
    try {
      const result = await getAvailableCurrencies();
      availableCurrencies = result.currencies || [];
    } catch (err) {
      console.error('[/api/nowpayments/currencies] Failed to fetch currencies:', err);
    }

    // Filter to only currencies we support in our CURRENCY_MAP
    const supportedNpCurrencies = Object.values(CURRENCY_MAP); // NP format codes
    const availableSupported = availableCurrencies.filter(c => supportedNpCurrencies.includes(c));

    // If NP API fails, use all supported as fallback
    const effectiveCurrencies = availableSupported.length > 0 ? availableSupported : supportedNpCurrencies;

    // Map NP currency codes to our internal codes for deposit
    const depositCurrencies = effectiveCurrencies.map(c => fromNowPaymentsCurrency(c));

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
      currencies: effectiveCurrencies,
      deposit: depositCurrencies,
      withdrawal: pixEnabled ? [...withdrawalCurrencies, 'pix'] : withdrawalCurrencies,
      pixEnabled,
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
