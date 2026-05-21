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
      console.info('[/api/nowpayments/currencies] NowPayments not enabled in DB');
      return NextResponse.json({
        success: false,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled: false,
        reason: 'nowpayments_not_enabled',
        message: 'NowPayments não está habilitado. Ative nas configurações do admin.',
      });
    }

    // Check if NowPayments is actually configured (env vars)
    const configured = isNowPaymentsConfigured();

    if (!configured) {
      console.info('[/api/nowpayments/currencies] NowPayments credentials NOT configured in env vars');
      return NextResponse.json({
        success: false,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        reason: 'credentials_missing',
        message: 'Credenciais NowPayments não configuradas nas variáveis de ambiente.',
      });
    }

    // =========================================================================
    // Fetch currencies from NowPayments API — ONLY what the MERCHANT has enabled
    // Uses GET /merchant/coins — returns only coins the merchant accepts
    // NO FALLBACK to /currencies endpoint — merchant must configure their coins
    // =========================================================================

    let merchantCoins: string[] = [];
    try {
      const merchantResult = await getMerchantCoins() as Record<string, unknown>;

      // Handle multiple possible response formats from NowPayments API
      let rawCoins: unknown[] = [];

      if (Array.isArray(merchantResult)) {
        // Direct array format: ["btc", "eth", ...]
        rawCoins = merchantResult;
      } else if (merchantResult?.selectedCurrencies && Array.isArray(merchantResult.selectedCurrencies)) {
        // { selectedCurrencies: [...] } format
        rawCoins = merchantResult.selectedCurrencies as unknown[];
      } else if (merchantResult?.currencies && Array.isArray(merchantResult.currencies)) {
        // { currencies: [...] } format
        rawCoins = merchantResult.currencies as unknown[];
      } else if (merchantResult?.coins && Array.isArray(merchantResult.coins)) {
        // { coins: [...] } format
        rawCoins = merchantResult.coins as unknown[];
      } else if (merchantResult?.result && Array.isArray(merchantResult.result)) {
        // { result: [...] } format
        rawCoins = merchantResult.result as unknown[];
      } else if (merchantResult?.availableCoins && Array.isArray(merchantResult.availableCoins)) {
        // { availableCoins: [...] } format
        rawCoins = merchantResult.availableCoins as unknown[];
      } else if (merchantResult?.data && Array.isArray(merchantResult.data)) {
        // { data: [...] } format
        rawCoins = merchantResult.data as unknown[];
      }

      merchantCoins = rawCoins.map((item: unknown) => {
        if (typeof item === 'string') return item.toLowerCase();
        const obj = item as Record<string, unknown>;
        return (String(obj.currency || obj.coin || obj.code || obj.symbol || '')).toLowerCase();
      }).filter(Boolean);

      console.info(`[/api/nowpayments/currencies] Fetched ${merchantCoins.length} merchant coins`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[/api/nowpayments/currencies] Failed to fetch merchant coins:', errMsg);
      // NO FALLBACK — return empty if merchant coins cannot be fetched
      return NextResponse.json({
        success: false,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        reason: 'api_error',
        message: `Erro ao buscar moedas do NowPayments: ${errMsg}`,
      });
    }

    // If no coins found, the merchant hasn't configured any currencies in their dashboard
    if (merchantCoins.length === 0) {
      console.info('[/api/nowpayments/currencies] No merchant coins found');
      return NextResponse.json({
        success: false,
        currencies: [],
        deposit: [],
        withdrawal: [],
        pixEnabled,
        reason: 'no_coins_configured',
        message: 'Nenhuma moeda configurada no painel NowPayments. Configure as moedas desejadas no dashboard da NowPayments.',
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
  } catch (error: unknown) {
    console.error('[/api/nowpayments/currencies] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      success: false,
      currencies: [],
      deposit: [],
      withdrawal: [],
      pixEnabled: false,
      reason: 'server_error',
      message: 'Erro interno ao buscar moedas.',
    });
  }
}
