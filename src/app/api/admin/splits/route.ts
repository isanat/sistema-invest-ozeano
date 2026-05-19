import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, d } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Get split configuration from SystemConfig
    const splitConfigs = await db.systemConfig.findMany({
      where: {
        key: { in: ['nowpayments_split_pct', 'nowpayments_split_wallet'] },
      },
    });
    const configMap = Object.fromEntries(splitConfigs.map((c) => [c.key, c.value]));

    // Get deposits that have splits processed
    const splitDeposits = await db.nowPaymentsDeposit.findMany({
      where: {
        splitProcessed: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const totalSplitAmount = splitDeposits.reduce(
      (sum, dep) => sum + d(dep.splitAmount),
      0
    );

    return apiSuccess({
      config: {
        splitPct: configMap.nowpayments_split_pct || '0',
        splitWallet: configMap.nowpayments_split_wallet || '',
      },
      splits: splitDeposits,
      totalSplitAmount,
      totalSplitDeposits: splitDeposits.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { splitPct, splitWallet } = body;

    // Update split configuration
    const updates: Promise<any>[] = [];

    if (splitPct !== undefined) {
      const pct = d(splitPct);
      if (pct < 0 || pct > 100) {
        return apiError('Percentual de split deve ser entre 0 e 100');
      }
      updates.push(
        db.systemConfig.upsert({
          where: { key: 'nowpayments_split_pct' },
          update: { value: String(pct) },
          create: {
            key: 'nowpayments_split_pct',
            value: String(pct),
            type: 'number',
            description: 'Percentual de split da plataforma (%)',
            category: 'nowpayments',
          },
        })
      );
    }

    if (splitWallet !== undefined) {
      updates.push(
        db.systemConfig.upsert({
          where: { key: 'nowpayments_split_wallet' },
          update: { value: splitWallet },
          create: {
            key: 'nowpayments_split_wallet',
            value: splitWallet,
            type: 'string',
            description: 'Carteira da plataforma para receber o split',
            category: 'nowpayments',
          },
        })
      );
    }

    await Promise.all(updates);

    // Admin log
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'update',
        entity: 'config',
        description: `Configuração de split atualizada: ${splitPct !== undefined ? `${splitPct}%` : ''} ${splitWallet ? `wallet: ${splitWallet}` : ''}`,
      },
    });

    return apiSuccess({ message: 'Configuração de split atualizada com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
