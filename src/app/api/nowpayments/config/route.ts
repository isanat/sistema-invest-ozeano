import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  getNowPaymentsConfig,
  getAvailableCurrencies,
  getBalance,
  clearConfigCache,
  testConnection,
} from '@/lib/nowpayments';

// GET - Return NowPayments configuration status
export async function GET() {
  try {
    await requireAdmin();

    const config = await getNowPaymentsConfig();
    let currencies: string[] = [];
    let balance: Record<string, number> = {};
    let connectionTest: Awaited<ReturnType<typeof testConnection>> | null = null;

    // If configured, fetch live data
    if (config.configured) {
      try {
        const currenciesResult = await getAvailableCurrencies();
        currencies = currenciesResult.currencies || [];
      } catch (err) {
        console.error('[NowPayments Config] Failed to fetch currencies:', err);
      }

      try {
        balance = await getBalance();
      } catch (err) {
        console.error('[NowPayments Config] Failed to fetch balance:', err);
      }
    }

    // Get internal NowPayments config from SystemConfig
    const configKeys = [
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    return apiSuccess({
      configured: config.configured,
      config: {
        hasApiKey: config.hasApiKey,
        hasEmail: config.hasEmail,
        hasPassword: config.hasPassword,
        hasIpnSecret: config.hasIpnSecret,
        has2FA: config.has2FA,
        baseUrl: config.baseUrl,
        enabled: configMap.nowpayments_enabled === 'true',
        splitPct: d(configMap.nowpayments_split_pct) || 0,
        splitWallet: configMap.nowpayments_split_wallet || '',
      },
      currencies,
      balance,
      connectionTest,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Update NowPayments configuration (credentials + settings)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    // Allow updating both credentials and settings
    const credentialKeys = [
      'nowpayments_api_key',
      'nowpayments_email',
      'nowpayments_password',
      'nowpayments_ipn_secret',
      'nowpayments_2fa_secret',
      'nowpayments_base_url',
    ];

    const settingKeys = [
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];

    const allAllowedKeys = [...credentialKeys, ...settingKeys];

    const updates: Record<string, string> = {};
    for (const key of allAllowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Nenhuma configuração válida fornecida');
    }

    // Determine category and type for each key
    const keyMeta: Record<string, { type: string; description: string; category: string }> = {
      nowpayments_api_key: { type: 'string', description: 'NowPayments API Key', category: 'nowpayments' },
      nowpayments_email: { type: 'string', description: 'NowPayments account email', category: 'nowpayments' },
      nowpayments_password: { type: 'string', description: 'NowPayments account password', category: 'nowpayments' },
      nowpayments_ipn_secret: { type: 'string', description: 'NowPayments IPN secret for webhook verification', category: 'nowpayments' },
      nowpayments_2fa_secret: { type: 'string', description: 'NowPayments 2FA TOTP secret for payout verification', category: 'nowpayments' },
      nowpayments_base_url: { type: 'string', description: 'NowPayments API base URL', category: 'nowpayments' },
      nowpayments_enabled: { type: 'boolean', description: 'Enable/disable NowPayments integration', category: 'nowpayments' },
      nowpayments_split_pct: { type: 'number', description: 'Percentage of deposits to split to platform wallet', category: 'nowpayments' },
      nowpayments_split_wallet: { type: 'string', description: 'Platform wallet address for deposit splits', category: 'nowpayments' },
    };

    // Upsert each config value
    for (const [key, value] of Object.entries(updates)) {
      const meta = keyMeta[key] || { type: 'string', description: key, category: 'nowpayments' };
      await db.systemConfig.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: {
          key,
          value,
          type: meta.type,
          description: meta.description,
          category: meta.category,
          isActive: true,
        },
      });
    }

    // Clear config cache so new values are picked up
    clearConfigCache();

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'config',
        description: `Updated NowPayments config: ${Object.keys(updates).join(', ')}`,
        newValue: JSON.stringify(Object.keys(updates)), // Don't log sensitive values
      },
    });

    // If credentials were updated, test the connection
    let connectionTest: Awaited<ReturnType<typeof testConnection>> | null = null;
    const hasCredentialUpdate = Object.keys(updates).some(k => credentialKeys.includes(k));
    if (hasCredentialUpdate) {
      try {
        connectionTest = await testConnection();
      } catch {
        // Connection test failed, but config was saved
      }
    }

    return apiSuccess({
      updated: Object.keys(updates),
      connectionTest,
      message: 'Configurações NowPayments atualizadas',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
