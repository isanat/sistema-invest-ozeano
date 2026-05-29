import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { adminConfigSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';

// Keys that should NOT be saved via admin config (managed via Vercel env vars)
const BLOCKED_CONFIG_KEYS = new Set([
  'nowpayments_api_key',
  'nowpayments_email',
  'nowpayments_password',
  'nowpayments_ipn_secret',
  'nowpayments_2fa_secret',
  'nowpayments_base_url',
  'nowpayments_deposit_currencies',
]);

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const configs = await db.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return apiSuccess({ configs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const data = adminConfigSchema.parse(body);

    // Block credential keys — must be configured via Vercel env vars
    if (BLOCKED_CONFIG_KEYS.has(data.key)) {
      return apiError('Esta configuração deve ser definida nas variáveis de ambiente do Vercel, não no painel admin.');
    }

    // Upsert config
    const oldConfig = await db.systemConfig.findUnique({ where: { key: data.key } });

    const config = await db.systemConfig.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        type: data.type,
        description: data.description,
        category: data.category,
      },
      create: {
        key: data.key,
        value: data.value,
        type: data.type,
        description: data.description,
        category: data.category,
      },
    });

    // Log the change
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: oldConfig ? 'update' : 'create',
        entity: 'config',
        entityId: config.id,
        oldValue: oldConfig ? JSON.stringify({ key: oldConfig.key, value: oldConfig.value }) : undefined,
        newValue: JSON.stringify({ key: config.key, value: config.value }),
        description: `Config ${oldConfig ? 'atualizada' : 'criada'}: ${data.key}`,
        ipAddress: getIpFromRequest(request),
      },
    });

    return apiSuccess({ config });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    if (!Array.isArray(body.configs)) {
      return apiError('Formato inválido: esperado array de configs');
    }

    const results = await db.$transaction(async (tx) => {
      const updated: any[] = [];

      for (const item of body.configs) {
        const data = adminConfigSchema.parse(item);

        // Block credential keys — must be configured via Vercel env vars
        if (BLOCKED_CONFIG_KEYS.has(data.key)) continue;

        const oldConfig = await tx.systemConfig.findUnique({ where: { key: data.key } });

        const config = await tx.systemConfig.upsert({
          where: { key: data.key },
          update: {
            value: data.value,
            type: data.type,
            description: data.description,
            category: data.category,
          },
          create: {
            key: data.key,
            value: data.value,
            type: data.type,
            description: data.description,
            category: data.category,
          },
        });

        // Log each change
        await tx.adminLog.create({
          data: {
            adminId: session.userId,
            action: oldConfig ? 'update' : 'create',
            entity: 'config',
            entityId: config.id,
            oldValue: oldConfig ? JSON.stringify({ key: oldConfig.key, value: oldConfig.value }) : undefined,
            newValue: JSON.stringify({ key: config.key, value: config.value }),
            description: `Config bulk ${oldConfig ? 'atualizada' : 'criada'}: ${data.key}`,
            ipAddress: getIpFromRequest(request),
          },
        });

        updated.push(config);
      }

      return updated;
    });

    return apiSuccess({ configs: results, updated: results.length });
  } catch (error) {
    return handleApiError(error);
  }
}
