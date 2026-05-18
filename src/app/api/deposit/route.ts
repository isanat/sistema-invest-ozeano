import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, d, ds, dusdt } from '@/lib/auth';
import { depositSchema } from '@/lib/validations';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';
import { getUSDTBRLRate } from '@/lib/market-data';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = depositSchema.parse(body);

    // Get deposit limits from SystemConfig
    const configKeys = ['min_deposit_usdt', 'max_deposit_usdt', 'pix_wallet_address', 'usdt_trc20_address', 'usdt_polygon_address', 'pix_key'];
    const configs = await db.systemConfig.findMany({
      where: { key: { in: configKeys } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const minDeposit = d(configMap.min_deposit_usdt) || 10;
    const maxDeposit = d(configMap.max_deposit_usdt) || 100000;

    if (data.amount < minDeposit) {
      return apiError(`Depósito mínimo: ${dusdt(minDeposit)} USDT`);
    }

    if (data.amount > maxDeposit) {
      return apiError(`Depósito máximo: ${dusdt(maxDeposit)} USDT`);
    }

    // Get USDT/BRL rate for PIX
    const usdtBrlRate = await getUSDTBRLRate();
    const brlAmount = data.method === 'pix' ? data.amount * usdtBrlRate : null;

    // Validate method-specific requirements
    if (data.method === 'usdt_trc20' && !data.txHash) {
      return apiError('Hash da transação é obrigatório para depósito USDT TRC20');
    }

    // Check for duplicate txHash
    if (data.txHash) {
      const existing = await db.investment.findUnique({ where: { txHash: data.txHash } });
      if (existing) {
        return apiError('Hash de transação já registrado', 409);
      }
    }

    // Create deposit
    const deposit = await db.investment.create({
      data: {
        userId: session.userId,
        amount: ds(data.amount),
        brlAmount: brlAmount ? ds(brlAmount) : null,
        usdtRate: ds(usdtBrlRate),
        type: 'deposit',
        method: data.method,
        network: data.network || (data.method === 'usdt_trc20' ? 'TRC20' : data.method === 'usdt_polygon' ? 'Polygon' : null),
        status: 'pending',
        txHash: data.txHash || null,
        description: `Depósito ${data.method === 'pix' ? 'PIX' : data.method.toUpperCase()} - ${dusdt(data.amount)} USDT${brlAmount ? ` (R$ ${brlAmount.toFixed(2)})` : ''}`,
      },
    });

    // Return deposit info with payment details
    const paymentInfo: any = {};

    if (data.method === 'pix') {
      paymentInfo.pixKey = configMap.pix_key || '';
      paymentInfo.pixAddress = configMap.pix_wallet_address || '';
      paymentInfo.brlAmount = brlAmount?.toFixed(2);
      paymentInfo.usdtRate = usdtBrlRate.toFixed(2);
    } else if (data.method === 'usdt_trc20') {
      paymentInfo.walletAddress = configMap.usdt_trc20_address || '';
      paymentInfo.network = 'TRC20';
    } else if (data.method === 'usdt_polygon') {
      paymentInfo.walletAddress = configMap.usdt_polygon_address || '';
      paymentInfo.network = 'Polygon';
    }

    return apiSuccess({
      deposit,
      paymentInfo,
      message: 'Solicitação de depósito criada. Aguarde a confirmação.',
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
