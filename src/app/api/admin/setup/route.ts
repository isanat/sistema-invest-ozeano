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
    const planCount = await db.investmentPlan.count();
    const affiliateLevelCount = await db.affiliateLevel.count();

    return apiSuccess({
      isSetup: adminCount > 0 && configCount > 0 && planCount > 0,
      hasAdmin: adminCount > 0,
      hasConfigs: configCount > 0,
      hasPlans: planCount > 0,
      hasAffiliateLevels: affiliateLevelCount > 0,
      counts: {
        admins: adminCount,
        configs: configCount,
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
      return apiError('Senha do admin deve ter no mínimo 8 caracteres');
    }
    const hashedPassword = await hashPassword(adminPassword);
    const admin = await db.user.create({
      data: {
        email: body.adminEmail || 'admin@ozeano.com',
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
      // Branding
      { key: 'site_logo', value: '', type: 'string', description: 'URL do logo do site (PNG ou SVG, fundo transparente)', category: 'branding' },
      { key: 'site_favicon', value: '', type: 'string', description: 'URL do favicon do site (ICO ou PNG, 32x32px)', category: 'branding' },
      // General
      { key: 'site_name', value: 'PLATAFORMA ROI', type: 'string', description: 'Nome do site', category: 'general' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Modo manutenção', category: 'general' },
      { key: 'usdt_brl_rate', value: '5.50', type: 'number', description: 'Câmbio fixo USDT/BRL', category: 'general' },
      // Deposit
      { key: 'min_deposit_usdt', value: '10', type: 'number', description: 'Depósito mínimo USDT', category: 'deposit' },
      { key: 'max_deposit_usdt', value: '100000', type: 'number', description: 'Depósito máximo USDT', category: 'deposit' },
      { key: 'pix_wallet_address', value: '', type: 'string', description: 'Endereço USDT para depósitos PIX', category: 'deposit' },
      { key: 'usdt_trc20_address', value: '', type: 'string', description: 'Endereço USDT TRC20 para depósitos', category: 'deposit' },
      { key: 'usdt_polygon_address', value: '', type: 'string', description: 'Endereço USDT Polygon para depósitos', category: 'deposit' },
      { key: 'pix_key', value: '', type: 'string', description: 'Chave PIX para recebimentos', category: 'deposit' },
      { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit' },
      { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit' },
      { key: 'manual_deposit_enabled', value: 'false', type: 'boolean', description: 'Ativar depósito manual (hash de transação)', category: 'deposit' },
      // Withdrawal
      { key: 'min_withdrawal_usdt', value: '10', type: 'number', description: 'Saque mínimo USDT', category: 'withdrawal' },
      { key: 'max_withdrawal_usdt', value: '50000', type: 'number', description: 'Saque máximo USDT', category: 'withdrawal' },
      { key: 'withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal' },
      { key: 'withdrawal_interval_hours', value: '12', type: 'number', description: 'Intervalo mínimo entre saques (horas)', category: 'withdrawal' },
      { key: 'manual_withdrawal_enabled', value: 'true', type: 'boolean', description: 'Permitir saques manuais (admin aprova cada solicitação)', category: 'withdrawal' },
      { key: 'nowpayments_withdrawal_enabled', value: 'false', type: 'boolean', description: 'Permitir saques automáticos via NowPayments (payout)', category: 'withdrawal' },
      // Trading
      { key: 'daily_roi_pct', value: '5', type: 'number', description: 'ROI diário padrão (%)', category: 'trading' },
      { key: 'min_investment_usdt', value: '10', type: 'number', description: 'Investimento mínimo USDT', category: 'trading' },
      // Affiliate
      { key: 'min_affiliate_withdrawal', value: '10', type: 'number', description: 'Saque mínimo afiliado USDT', category: 'affiliate' },
      { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', description: 'Taxa saque afiliado (%)', category: 'affiliate' },
      { key: 'affiliate_commission_mode', value: 'system_margin', type: 'string', description: 'Modo de comissão: system_margin, investment_profit, revenue_pool', category: 'affiliate' },
      { key: 'affiliate_system_margin_pct', value: '30', type: 'number', description: 'Margem do sistema (%) para modo system_margin', category: 'affiliate' },
      { key: 'affiliate_pool_revenue_pct', value: '5', type: 'number', description: '% da receita para pool de afiliados (modo revenue_pool)', category: 'affiliate' },
      { key: 'affiliate_investment_bonus_pct', value: '2', type: 'number', description: 'Bônus de investimento (%) para modo investment_profit', category: 'affiliate' },
      { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', description: 'Cap diário de comissões afiliado em USDT (0 = sem cap explícito)', category: 'affiliate' },
      // NowPayments
      { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'Ativar depósito automático via NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_deposit_currencies', value: 'usdttrc20', type: 'string', description: 'Moedas aceitas para depósito NowPayments (separar por vírgula)', category: 'nowpayments' },
      { key: 'nowpayments_api_key', value: '', type: 'secret', description: 'Chave de API do painel NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_email', value: '', type: 'string', description: 'E-mail da conta NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_password', value: '', type: 'secret', description: 'Senha da conta NowPayments', category: 'nowpayments' },
      { key: 'nowpayments_ipn_secret', value: '', type: 'secret', description: 'Chave secreta para verificação de webhooks', category: 'nowpayments' },
      { key: 'nowpayments_2fa_secret', value: '', type: 'secret', description: 'Chave TOTP para verificação automática de payouts', category: 'nowpayments' },
      { key: 'nowpayments_base_url', value: 'https://api.nowpayments.io/v1', type: 'string', description: 'URL base da API NowPayments (não alterar)', category: 'nowpayments' },
      { key: 'nowpayments_split_pct', value: '0', type: 'number', description: 'Split da Plataforma (%)', category: 'nowpayments' },
      { key: 'nowpayments_split_wallet', value: '', type: 'string', description: 'Carteira de Split', category: 'nowpayments' },
    ];

    await db.systemConfig.createMany({ data: configs });

    // Create affiliate levels (11 levels)
    // L1=10%, L2=4%, L3=3%, L4=2%, L5=1.5%, L6=1%, L7=0.8%, L8=0.5%, L9=0.4%, L10=0.3%, L11=0.5%
    const affiliateLevels = [
      { level: 1, percentage: '10', description: 'Nível 1 - Indicação direta' },
      { level: 2, percentage: '4', description: 'Nível 2' },
      { level: 3, percentage: '3', description: 'Nível 3' },
      { level: 4, percentage: '2', description: 'Nível 4' },
      { level: 5, percentage: '1.5', description: 'Nível 5' },
      { level: 6, percentage: '1', description: 'Nível 6' },
      { level: 7, percentage: '0.8', description: 'Nível 7' },
      { level: 8, percentage: '0.5', description: 'Nível 8' },
      { level: 9, percentage: '0.4', description: 'Nível 9' },
      { level: 10, percentage: '0.3', description: 'Nível 10' },
      { level: 11, percentage: '0.5', description: 'Nível 11' },
    ];

    await db.affiliateLevel.createMany({ data: affiliateLevels });

    // Create default investment plans - PLATAFORMA ROI (5% daily ROI)
    const plans = [
      {
        name: 'Starter',
        description: 'Comece com pouco e veja seu saldo crescer a cada 24h',
        minAmount: '10',
        maxAmount: '49.99',
        dailyRoiPct: '5',
        durationDays: 40,
        isActive: true,
        isFeatured: false,
        sortOrder: 1,
      },
      {
        name: 'Growth',
        description: 'Dobre seu capital em até 40 dias com ROI diário',
        minAmount: '50',
        maxAmount: '99.99',
        dailyRoiPct: '5',
        durationDays: 40,
        isActive: true,
        isFeatured: false,
        sortOrder: 2,
      },
      {
        name: 'Premium',
        description: 'O plano mais popular! Rendimento diário garantido',
        minAmount: '100',
        maxAmount: '499.99',
        dailyRoiPct: '5',
        durationDays: 40,
        isActive: true,
        isFeatured: true,
        sortOrder: 3,
      },
      {
        name: 'Elite',
        description: 'Para investidores que buscam maximizar ganhos',
        minAmount: '500',
        maxAmount: '1499.99',
        dailyRoiPct: '5',
        durationDays: 40,
        isActive: true,
        isFeatured: true,
        sortOrder: 4,
      },
      {
        name: 'VIP',
        description: 'Exclusivo para grandes investidores - retorno máximo',
        minAmount: '1500',
        maxAmount: null,
        dailyRoiPct: '5',
        durationDays: 40,
        isActive: true,
        isFeatured: true,
        sortOrder: 5,
      },
    ];

    await db.investmentPlan.createMany({ data: plans });

    // Create default copy traders
    const copyTraders = [
      {
        name: 'Alex Rivera',
        avatar: null,
        specialty: 'DeFi',
        winRate: '91',
        totalPnl: '285000',
        monthlyRoi: '180',
        riskLevel: 'medium',
        isActive: true,
        isFeatured: true,
        sortOrder: 1,
      },
      {
        name: 'Sofia Chen',
        avatar: null,
        specialty: 'Arbitrage',
        winRate: '94',
        totalPnl: '412000',
        monthlyRoi: '150',
        riskLevel: 'low',
        isActive: true,
        isFeatured: true,
        sortOrder: 2,
      },
      {
        name: 'Marcus Johnson',
        avatar: null,
        specialty: 'Momentum',
        winRate: '87',
        totalPnl: '195000',
        monthlyRoi: '220',
        riskLevel: 'high',
        isActive: true,
        isFeatured: true,
        sortOrder: 3,
      },
      {
        name: 'Elena Volkov',
        avatar: null,
        specialty: 'Swing Trading',
        winRate: '89',
        totalPnl: '320000',
        monthlyRoi: '165',
        riskLevel: 'medium',
        isActive: true,
        isFeatured: false,
        sortOrder: 4,
      },
    ];

    await db.copyTrader.createMany({ data: copyTraders });

    // Create default trading pools
    const tradingPools = [
      {
        name: 'ROI Alpha Pool',
        totalAum: '1500000',
        dailyVolume: '85000',
        strategy: 'arbitrage',
        status: 'active',
      },
      {
        name: 'ROI Growth Pool',
        totalAum: '750000',
        dailyVolume: '42000',
        strategy: 'momentum',
        status: 'active',
      },
      {
        name: 'ROI Stable Pool',
        totalAum: '2200000',
        dailyVolume: '95000',
        strategy: 'market_making',
        status: 'active',
      },
    ];

    await db.tradingPool.createMany({ data: tradingPools });

    // Create affiliate ranks (Team Bonus system)
    // Bronze (+1% ROI), Prata (+2% ROI), Ouro (+3% ROI)
    const affiliateRanks = [
      {
        name: 'Bronze',
        icon: '🥉',
        color: '#CD7F32',
        minReferrals: 10,
        minEarnings: '0',
        bonusAmount: '0',
        commissionBoost: '1',
        perks: JSON.stringify(['+1% ROI diário em todos os investimentos']),
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Prata',
        icon: '🥈',
        color: '#C0C0C0',
        minReferrals: 20,
        minEarnings: '0',
        bonusAmount: '0',
        commissionBoost: '2',
        perks: JSON.stringify(['+2% ROI diário em todos os investimentos']),
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Ouro',
        icon: '🥇',
        color: '#FFD700',
        minReferrals: 30,
        minEarnings: '0',
        bonusAmount: '0',
        commissionBoost: '3',
        perks: JSON.stringify(['+3% ROI diário em todos os investimentos']),
        sortOrder: 3,
        isActive: true,
      },
    ];

    await db.affiliateRank.createMany({ data: affiliateRanks });

    // Log setup
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'create',
        entity: 'system',
        description: 'Sistema inicializado com sucesso',
        newValue: JSON.stringify({
          admin: admin.email,
          configs: configs.length,
          plans: plans.length,
          affiliateLevels: affiliateLevels.length,
          copyTraders: copyTraders.length,
          tradingPools: tradingPools.length,
          affiliateRanks: affiliateRanks.length,
        }),
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
