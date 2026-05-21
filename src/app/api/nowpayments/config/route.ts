import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  getNowPaymentsConfig,
  getAvailableCurrencies,
  getMerchantCoins,
  getBalance,
  clearConfigCache,
  testConnection,
} from '@/lib/nowpayments';

// GET - Return NowPayments configuration status
// Credentials are read from env vars only — never from database
export async function GET() {
  try {
    await requireAdmin();

    const config = getNowPaymentsConfig();
    let currencies: string[] = [];
    let merchantCoins: string[] = [];
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
        console.error('[NowPayments Config] Failed to fetch merchant coins:', err);
      }

      try {
        balance = await getBalance();
      } catch (err) {
        console.error('[NowPayments Config] Failed to fetch balance:', err);
      }
    }

    // Get internal NowPayments settings from SystemConfig
    const settingKeys = [
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: settingKeys } },
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
      merchantCoins,
      balance,
      connectionTest,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Update NowPayments settings ONLY (enabled, split_pct, split_wallet)
// Credentials (API key, email, password, etc.) must be set via Vercel environment variables
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    // Only allow updating settings — NOT credentials
    const settingKeys = [
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];

    const updates: Record<string, string> = {};
    for (const key of settingKeys) {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Nenhuma configuração válida fornecida. Credenciais NowPayments devem ser configuradas nas variáveis de ambiente do Vercel.');
    }

    // Key metadata for upsert
    const keyMeta: Record<string, { type: string; description: string; category: string }> = {
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
        description: `Updated NowPayments settings: ${Object.keys(updates).join(', ')}`,
        newValue: JSON.stringify(Object.keys(updates)), // Don't log sensitive values
      },
    });

    return apiSuccess({
      updated: Object.keys(updates),
      message: 'Configurações NowPayments atualizadas',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Test NowPayments API connection
export async function PUT() {
  try {
    await requireAdmin();

    const connectionTest = await testConnection();

    return apiSuccess({
      connectionTest,
      message: connectionTest.connected
        ? 'Conexão com NowPayments bem-sucedida!'
        : `Falha na conexão: ${connectionTest.error || 'Credenciais não configuradas nas variáveis de ambiente'}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
