import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { isNowPaymentsConfigured } from '@/lib/nowpayments';

// Public site configuration — no auth required
// Returns deposit/withdrawal method toggles, min amounts, site name, etc.
// All boolean values use STRICT === 'true' check: defaults to FALSE if key missing
// NowPayments booleans also require actual API credentials to be set (env vars)
export async function GET() {
  try {
    const configKeys = [
      'has_pix',
      'has_usdt',
      'manual_deposit_enabled',
      'nowpayments_enabled',
      'manual_withdrawal_enabled',
      'nowpayments_withdrawal_enabled',
      'min_deposit_usdt',
      'max_deposit_usdt',
      'min_withdrawal_usdt',
      'max_withdrawal_usdt',
      'withdrawal_fee_pct',
      'withdrawal_interval_hours',
      'site_name',
      'site_logo',
      'site_favicon',
      'usdt_brl_rate',
      'maintenance_mode',
    ];

    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });

    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    // Check if NowPayments is actually configured (has API key in env vars)
    // If admin enabled it but didn't add credentials, it won't work
    const npActuallyConfigured = isNowPaymentsConfigured();

    return apiSuccess({
      // Deposit settings
      hasPix: configMap.has_pix === 'true',
      hasUsdt: configMap.has_usdt === 'true',
      manualDepositEnabled: configMap.manual_deposit_enabled === 'true',
      // NowPayments only counts as enabled if admin toggled ON AND credentials are in env vars
      nowpaymentsEnabled: configMap.nowpayments_enabled === 'true' && npActuallyConfigured,
      minDepositUsdt: Number(configMap.min_deposit_usdt) || 10,
      maxDepositUsdt: Number(configMap.max_deposit_usdt) || 100000,
      // Withdrawal settings
      manualWithdrawalEnabled: configMap.manual_withdrawal_enabled === 'true',
      // NowPayments withdrawal also requires credentials
      nowpaymentsWithdrawalEnabled: configMap.nowpayments_withdrawal_enabled === 'true' && npActuallyConfigured,
      minWithdrawalUsdt: Number(configMap.min_withdrawal_usdt) || 10,
      maxWithdrawalUsdt: Number(configMap.max_withdrawal_usdt) || 50000,
      withdrawalFeePct: Number(configMap.withdrawal_fee_pct) || 0,
      withdrawalIntervalHours: Number(configMap.withdrawal_interval_hours) || 0,
      // Site settings
      siteName: configMap.site_name || 'PLATAFORMA ROI',
      hasLogo: !!configMap.site_logo,
      hasFavicon: !!configMap.site_favicon,
      siteLogo: configMap.site_logo || '',
      siteFavicon: configMap.site_favicon || '',
      usdtBrlRate: Number(configMap.usdt_brl_rate) || 5.50,
      maintenanceMode: configMap.maintenance_mode === 'true',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
