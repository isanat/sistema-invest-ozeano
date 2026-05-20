import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// One-time migration: add missing config keys that should exist
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const missingConfigs = [
      { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit' },
      { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit' },
      { key: 'manual_deposit_enabled', value: 'false', type: 'boolean', description: 'Ativar depósito manual (hash de transação)', category: 'deposit' },
      { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'Ativar depósito automático via NowPayments', category: 'nowpayments' },
    ];

    let created = 0;
    let skipped = 0;

    for (const config of missingConfigs) {
      const existing = await db.systemConfig.findUnique({ where: { key: config.key } });
      if (!existing) {
        await db.systemConfig.create({ data: config });
        created++;
      } else {
        skipped++;
      }
    }

    return apiSuccess({
      message: `Migração concluída: ${created} configs criadas, ${skipped} já existiam`,
      created,
      skipped,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
