import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { adminConfigSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

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

    const results = [];

    for (const item of body.configs) {
      const data = adminConfigSchema.parse(item);

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

      // Log each change
      await db.adminLog.create({
        data: {
          adminId: session.userId,
          action: oldConfig ? 'update' : 'create',
          entity: 'config',
          entityId: config.id,
          oldValue: oldConfig ? JSON.stringify({ key: oldConfig.key, value: oldConfig.value }) : undefined,
          newValue: JSON.stringify({ key: config.key, value: config.value }),
          description: `Config bulk ${oldConfig ? 'atualizada' : 'criada'}: ${data.key}`,
        },
      });

      results.push(config);
    }

    return apiSuccess({ configs: results, updated: results.length });
  } catch (error) {
    return handleApiError(error);
  }
}
