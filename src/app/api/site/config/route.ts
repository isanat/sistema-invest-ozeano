import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// Public site configuration — no auth required
// Returns deposit method toggles, min amounts, site name, etc.
// All boolean values use STRICT === 'true' check: defaults to FALSE if key missing
export async function GET() {
  try {
    const configKeys = [
      'has_pix',
      'has_usdt',
      'manual_deposit_enabled',
      'nowpayments_enabled',
      'nowpayments_deposit_currencies',
      'min_deposit_usdt',
      'min_withdrawal_usdt',
      'site_name',
      'site_logo',
      'site_favicon',
    ];

    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });

    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    // Parse admin-selected deposit currencies (comma-separated)
    const adminCurrencies = (configMap.nowpayments_deposit_currencies || '')
      .split(',')
      .map((c: string) => c.trim().toLowerCase())
      .filter(Boolean);

    return apiSuccess({
      hasPix: configMap.has_pix === 'true',
      hasUsdt: configMap.has_usdt === 'true',
      manualDepositEnabled: configMap.manual_deposit_enabled === 'true',
      nowpaymentsEnabled: configMap.nowpayments_enabled === 'true',
      nowpaymentsDepositCurrencies: adminCurrencies,
      minDepositUsdt: Number(configMap.min_deposit_usdt) || 10,
      minWithdrawalUsdt: Number(configMap.min_withdrawal_usdt) || 10,
      siteName: configMap.site_name || 'PLATAFORMA ROI',
      hasLogo: !!configMap.site_logo,
      hasFavicon: !!configMap.site_favicon,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
