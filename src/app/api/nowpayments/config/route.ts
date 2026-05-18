import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d, ds } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import {
  isNowPaymentsConfigured,
  getNowPaymentsConfig,
  getAvailableCurrencies,
  getBalance,
} from '@/lib/nowpayments';

// GET - Return NowPayments configuration status
export async function GET() {
  try {
    await requireAdmin();

    const config = getNowPaymentsConfig();
    let currencies: string[] = [];
    let balance: Record<string, number> = {};

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
        baseUrl: config.baseUrl,
        enabled: configMap.nowpayments_enabled === 'true',
        splitPct: d(configMap.nowpayments_split_pct) || 0,
        splitWallet: configMap.nowpayments_split_wallet || '',
      },
      currencies,
      balance,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Update NowPayments configuration in SystemConfig
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const allowedKeys = [
      'nowpayments_enabled',
      'nowpayments_split_pct',
      'nowpayments_split_wallet',
    ];

    const updates: Record<string, string> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Nenhuma configuração válida fornecida');
    }

    // Upsert each config value
    for (const [key, value] of Object.entries(updates)) {
      await db.systemConfig.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: {
          key,
          value,
          type: key === 'nowpayments_enabled' ? 'boolean' : key === 'nowpayments_split_pct' ? 'number' : 'string',
          description: key === 'nowpayments_enabled'
            ? 'Enable/disable NowPayments integration'
            : key === 'nowpayments_split_pct'
              ? 'Percentage of deposits to split to platform wallet'
              : 'Platform wallet address for deposit splits',
          category: 'deposit',
          isActive: true,
        },
      });
    }

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'config',
        description: `Updated NowPayments config: ${Object.keys(updates).join(', ')}`,
        newValue: JSON.stringify(updates),
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
