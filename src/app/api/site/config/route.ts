import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

// Public site configuration — no auth required
// Returns deposit method toggles, min amounts, site name, etc.
export async function GET() {
  try {
    const configKeys = [
      'has_pix',
      'has_usdt',
      'manual_deposit_enabled',
      'nowpayments_enabled',
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

    return apiSuccess({
      hasPix: configMap.has_pix === 'true',
      hasUsdt: configMap.has_usdt !== 'false', // default true if not set
      manualDepositEnabled: configMap.manual_deposit_enabled === 'true',
      nowpaymentsEnabled: configMap.nowpayments_enabled !== 'false', // default true
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
