import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { isNowPaymentsConfigured } from '@/lib/nowpayments';

// Public site configuration — no auth required
// Returns deposit/withdrawal method toggles, min amounts, site name, etc.
// All boolean values use STRICT === 'true' check: defaults to FALSE if key missing
// NowPayments booleans also require actual API credentials to be set
export async function GET() {
  try {
    const configKeys = [
      'has_pix',
      'has_usdt',
      'manual_deposit_enabled',
      'nowpayments_enabled',
      'nowpayments_deposit_currencies',
      'manual_withdrawal_enabled',
      'nowpayments_withdrawal_enabled',
      'min_deposit_usdt',
      'max_deposit_usdt',
      'min_withdrawal_usdt',
      'max_withdrawal_usdt',
      'withdrawal_fee_pct',
      'site_name',
      'site_logo',
      'site_favicon',
    ];

    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });

    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    // Check if NowPayments is actually configured (has API key)
    // If admin enabled it but didn't add credentials, it won't work
    let npActuallyConfigured = false;
    if (configMap.nowpayments_enabled === 'true') {
      try {
        npActuallyConfigured = await isNowPaymentsConfigured();
      } catch {
        npActuallyConfigured = false;
      }
    }

    // Parse admin-selected deposit currencies (comma-separated)
    const adminCurrencies = (configMap.nowpayments_deposit_currencies || '')
      .split(',')
      .map((c: string) => c.trim().toLowerCase())
      .filter(Boolean);

    return apiSuccess({
      // Deposit settings
      hasPix: configMap.has_pix === 'true',
      hasUsdt: configMap.has_usdt === 'true',
      manualDepositEnabled: configMap.manual_deposit_enabled === 'true',
      // NowPayments only counts as enabled if admin toggled ON AND credentials are configured
      nowpaymentsEnabled: configMap.nowpayments_enabled === 'true' && npActuallyConfigured,
      nowpaymentsDepositCurrencies: adminCurrencies,
      minDepositUsdt: Number(configMap.min_deposit_usdt) || 10,
      maxDepositUsdt: Number(configMap.max_deposit_usdt) || 100000,
      // Withdrawal settings
      manualWithdrawalEnabled: configMap.manual_withdrawal_enabled === 'true',
      // NowPayments withdrawal also requires credentials
      nowpaymentsWithdrawalEnabled: configMap.nowpayments_withdrawal_enabled === 'true' && npActuallyConfigured,
      minWithdrawalUsdt: Number(configMap.min_withdrawal_usdt) || 10,
      maxWithdrawalUsdt: Number(configMap.max_withdrawal_usdt) || 50000,
      withdrawalFeePct: Number(configMap.withdrawal_fee_pct) || 0,
      // Site settings
      siteName: configMap.site_name || 'PLATAFORMA ROI',
      hasLogo: !!configMap.site_logo,
      hasFavicon: !!configMap.site_favicon,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
