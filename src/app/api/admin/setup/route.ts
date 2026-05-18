import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, d, ds } from '@/lib/auth';
import { generateAffiliateCode } from '@/lib/affiliate';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    // Check if system is already set up
    const adminCount = await db.user.count({ where: { role: 'admin' } });
    const configCount = await db.systemConfig.count();
    const minerCount = await db.miner.count();
    const planCount = await db.miningPlan.count();
    const affiliateLevelCount = await db.affiliateLevel.count();

    return apiSuccess({
      isSetup: adminCount > 0 && configCount > 0 && minerCount > 0,
      hasAdmin: adminCount > 0,
      hasConfigs: configCount > 0,
      hasMiners: minerCount > 0,
      hasPlans: planCount > 0,
      hasAffiliateLevels: affiliateLevelCount > 0,
      counts: {
        admins: adminCount,
        configs: configCount,
        miners: minerCount,
        plans: planCount,
        affiliateLevels: affiliateLevelCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow setup if no admin exists
    const adminCount = await db.user.count({ where: { role: 'admin' } });
    if (adminCount > 0) {
      return apiError('Sistema já inicializado', 400);
    }

    const body = await request.json();

    // Create admin user — require a strong password (no default)
    const adminPassword = body.adminPassword;
    if (!adminPassword || adminPassword.length < 8) {
      return apiError('Admin password must be at least 8 characters', 400);
    }
    const hashedPassword = await hashPassword(adminPassword);
    const admin = await db.user.create({
      data: {
        email: body.adminEmail || 'admin@miningprotocol.com',
        password: hashedPassword,
        name: body.adminName || 'Administrator',
        role: 'admin',
        affiliateCode: generateAffiliateCode(body.adminName || 'Administrator'),
        hasInvested: true,
        linkUnlocked: true,
      },
    });

    // Create system configs
    const configs = [
      { key: 'min_deposit_usdt', value: '10', type: 'number', description: 'Depósito mínimo USDT', category: 'deposit' },
      { key: 'max_deposit_usdt', value: '100000', type: 'number', description: 'Depósito máximo USDT', category: 'deposit' },
      { key: 'min_withdrawal_usdt', value: '10', type: 'number', description: 'Saque mínimo USDT', category: 'withdrawal' },
      { key: 'max_withdrawal_usdt', value: '50000', type: 'number', description: 'Saque máximo USDT', category: 'withdrawal' },
      { key: 'withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal' },
      { key: 'min_affiliate_withdrawal', value: '10', type: 'number', description: 'Saque mínimo afiliado USDT', category: 'affiliate' },
      { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa saque afiliado (%)', category: 'affiliate' },
      { key: 'affiliate_commission_mode', value: 'mining_profit', type: 'string', description: 'Modo de comissão: system_margin, mining_profit, revenue_pool', category: 'affiliate' },
      { key: 'affiliate_system_margin_pct', value: '30', type: 'number', description: 'Margem do sistema (%) para modo system_margin', category: 'affiliate' },
      { key: 'affiliate_pool_revenue_pct', value: '5', type: 'number', description: '% da receita para pool de afiliados (modo revenue_pool)', category: 'affiliate' },
      { key: 'affiliate_rental_bonus_pct', value: '2', type: 'number', description: 'Bônus de locação (%) para modo mining_profit', category: 'affiliate' },
      { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', description: 'Cap diário de comissões afiliado em USDT (0 = sem cap explícito, usa reserva)', category: 'affiliate' },
      { key: 'pix_wallet_address', value: '', type: 'string', description: 'Endereço USDT para depósitos PIX', category: 'deposit' },
      { key: 'usdt_trc20_address', value: '', type: 'string', description: 'Endereço USDT TRC20 para depósitos', category: 'deposit' },
      { key: 'usdt_polygon_address', value: '', type: 'string', description: 'Endereço USDT Polygon para depósitos', category: 'deposit' },
      { key: 'pix_key', value: '', type: 'string', description: 'Chave PIX para recebimentos', category: 'deposit' },
      { key: 'site_name', value: 'Mining Protocol', type: 'string', description: 'Nome do site', category: 'general' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Modo manutenção', category: 'general' },
    ];

    await db.systemConfig.createMany({ data: configs });

    // Create affiliate levels (designed: 8%, 3%, 1.5%, 0.5%, 0.25%)
    const affiliateLevels = [
      { level: 1, percentage: '8', description: 'Nível 1 - Indicação direta' },
      { level: 2, percentage: '3', description: 'Nível 2' },
      { level: 3, percentage: '1.5', description: 'Nível 3' },
      { level: 4, percentage: '0.5', description: 'Nível 4' },
      { level: 5, percentage: '0.25', description: 'Nível 5' },
    ];

    await db.affiliateLevel.createMany({ data: affiliateLevels });

    // Create default miners
    const miners = [
      {
        name: 'Antminer S21 XP',
        model: 'S21 XP',
        hashRate: '270 TH/s',
        powerConsumption: '3650',
        coin: 'BTC',
        pool: 'Binance Pool',
        dailyRevenue: '5.20',
        pricePerDay: '2.60',
        minRentalDays: 7,
        maxRentalDays: 365,
        profitSharePct: '70',
        efficiency: '13.5',
        description: 'Mais eficiente mineradora BTC do mercado',
        isFeatured: true,
        sortOrder: 0,
      },
      {
        name: 'Antminer L9',
        model: 'L9',
        hashRate: '16 GH/s',
        powerConsumption: '3360',
        coin: 'LTC',
        pool: 'Binance Pool',
        dailyRevenue: '5.50',
        pricePerDay: '2.74',
        minRentalDays: 7,
        maxRentalDays: 365,
        profitSharePct: '70',
        efficiency: '210',
        description: 'Mineradora Scrypt de alta performance',
        isFeatured: true,
        sortOrder: 1,
      },
      {
        name: 'IceRiver KS5L',
        model: 'KS5L',
        hashRate: '12 TH/s',
        powerConsumption: '3400',
        coin: 'KAS',
        pool: 'Binance Pool',
        dailyRevenue: '2.80',
        pricePerDay: '2.80',
        minRentalDays: 7,
        maxRentalDays: 365,
        profitSharePct: '70',
        efficiency: '283',
        description: 'Mineradora KHeavyHash especializada em KAS',
        isFeatured: true,
        sortOrder: 2,
      },
      {
        name: 'Antminer S21',
        model: 'S21',
        hashRate: '200 TH/s',
        powerConsumption: '3500',
        coin: 'BTC',
        pool: 'Binance Pool',
        dailyRevenue: '3.85',
        pricePerDay: '2.10',
        minRentalDays: 7,
        maxRentalDays: 365,
        profitSharePct: '70',
        efficiency: '17.5',
        description: 'Mineradora BTC intermediária',
        isFeatured: false,
        sortOrder: 3,
      },
    ];

    for (const miner of miners) {
      const createdMiner = await db.miner.create({ data: miner });

      // Create plans for each miner
      const plans = [
        {
          name: `${miner.name} - Starter`,
          description: 'Plano inicial - 7 dias',
          minerId: createdMiner.id,
          days: 7,
          discountPct: '0',
          isActive: true,
          isFeatured: false,
          sortOrder: 0,
        },
        {
          name: `${miner.name} - Pro`,
          description: 'Plano profissional - 30 dias',
          minerId: createdMiner.id,
          days: 30,
          discountPct: '5',
          isActive: true,
          isFeatured: true,
          sortOrder: 1,
        },
        {
          name: `${miner.name} - Elite`,
          description: 'Plano elite - 90 dias',
          minerId: createdMiner.id,
          days: 90,
          discountPct: '10',
          isActive: true,
          isFeatured: false,
          sortOrder: 2,
        },
        {
          name: `${miner.name} - Ultimate`,
          description: 'Plano máximo - 365 dias',
          minerId: createdMiner.id,
          days: 365,
          discountPct: '15',
          isActive: true,
          isFeatured: false,
          sortOrder: 3,
        },
      ];

      for (const plan of plans) {
        const pricePerDay = d(miner.pricePerDay);
        const dailyRevenue = d(miner.dailyRevenue);
        const profitShare = d(miner.profitSharePct);
        const discount = d(plan.discountPct);

        const totalPrice = pricePerDay * plan.days * (1 - discount / 100);
        const dailyReturn = dailyRevenue * (profitShare / 100);
        const totalReturn = dailyReturn * plan.days;

        await db.miningPlan.create({
          data: {
            ...plan,
            totalPrice: ds(totalPrice),
            dailyReturn: ds(dailyReturn),
            totalReturn: ds(totalReturn),
          },
        });
      }
    }

    // Log setup
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'create',
        entity: 'system',
        description: 'Sistema inicializado com sucesso',
        newValue: JSON.stringify({ admin: admin.email, configs: configs.length, miners: miners.length }),
      },
    });

    return apiSuccess({
      message: 'Sistema inicializado com sucesso',
      admin: { id: admin.id, email: admin.email },
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
