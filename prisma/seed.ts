import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================================
  // 1. Create Admin User
  // ============================================================================
  const adminPasswordHash = await bcrypt.hash('Admin@2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@plataformaroi.com' },
    update: {},
    create: {
      email: 'admin@plataformaroi.com',
      password: adminPasswordHash,
      name: 'Admin ROI',
      role: 'admin',
      isActive: true,
      balance: '0',
      affiliateBalance: '0',
      totalRoi: '0',
      totalInvested: '0',
      totalWithdrawn: '0',
      voucherBalance: '0',
      teamBonusPct: '0',
      affiliateCode: 'ADMIN01',
      hasInvested: true,
      linkUnlocked: true,
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ============================================================================
  // 2. Create Test User
  // ============================================================================
  const userPasswordHash = await bcrypt.hash('User@2026!', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: userPasswordHash,
      name: 'Usuario Teste',
      role: 'user',
      isActive: true,
      balance: '100',
      affiliateBalance: '0',
      totalRoi: '0',
      totalInvested: '100',
      totalWithdrawn: '0',
      voucherBalance: '0',
      teamBonusPct: '0',
      hasInvested: true,
      linkUnlocked: true,
    },
  });
  console.log(`✅ Test user created: ${testUser.email}`);

  // ============================================================================
  // 3. Create Investment Plans
  // ============================================================================
  const plans = [
    {
      name: 'Starter',
      description: 'Plan inicial para comenzar en copy trading. Ideal para principiantes que quieren probar la plataforma con poco capital.',
      minAmount: '10',
      maxAmount: '99',
      dailyRoiPct: '1.5',
      durationDays: 30,
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
    },
    {
      name: 'Silver',
      description: 'Plan Silver con ROI mejorado. Perfecto para inversores que buscan un equilibrio entre rendimiento y seguridad.',
      minAmount: '100',
      maxAmount: '499',
      dailyRoiPct: '2.0',
      durationDays: 35,
      isActive: true,
      isFeatured: false,
      sortOrder: 2,
    },
    {
      name: 'Gold',
      description: 'Plan Gold con alto rendimiento. Diseñado para inversores experimentados que buscan maximizar sus ganancias.',
      minAmount: '500',
      maxAmount: '1999',
      dailyRoiPct: '2.5',
      durationDays: 40,
      isActive: true,
      isFeatured: true,
      sortOrder: 3,
    },
    {
      name: 'Platinum',
      description: 'Plan Platinum exclusivo con el mejor ROI. Para inversores premium que quieren los máximos beneficios del copy trading.',
      minAmount: '2000',
      maxAmount: '9999',
      dailyRoiPct: '3.0',
      durationDays: 45,
      isActive: true,
      isFeatured: false,
      sortOrder: 4,
    },
    {
      name: 'Diamond',
      description: 'Plan Diamond VIP. Acceso exclusivo a los mejores traders de la plataforma con rendimiento premium garantizado.',
      minAmount: '10000',
      maxAmount: null,
      dailyRoiPct: '3.5',
      durationDays: 50,
      isActive: true,
      isFeatured: true,
      sortOrder: 5,
    },
  ];

  for (const plan of plans) {
    await prisma.investmentPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
  console.log('✅ Investment plans created: Starter, Silver, Gold, Platinum, Diamond');

  // ============================================================================
  // 4. Create Affiliate Levels (11 levels)
  // ============================================================================
  const levels = [
    { level: 1, percentage: '10', description: 'Nivel 1 - Indicación directa', isActive: true },
    { level: 2, percentage: '4', description: 'Nivel 2', isActive: true },
    { level: 3, percentage: '3', description: 'Nivel 3', isActive: true },
    { level: 4, percentage: '2', description: 'Nivel 4', isActive: true },
    { level: 5, percentage: '1.5', description: 'Nivel 5', isActive: true },
    { level: 6, percentage: '1', description: 'Nivel 6', isActive: true },
    { level: 7, percentage: '0.8', description: 'Nivel 7', isActive: true },
    { level: 8, percentage: '0.5', description: 'Nivel 8', isActive: true },
    { level: 9, percentage: '0.4', description: 'Nivel 9', isActive: true },
    { level: 10, percentage: '0.3', description: 'Nivel 10', isActive: true },
    { level: 11, percentage: '0.5', description: 'Nivel 11', isActive: true },
  ];

  for (const lvl of levels) {
    await prisma.affiliateLevel.upsert({
      where: { level: lvl.level },
      update: {},
      create: lvl,
    });
  }
  console.log('✅ Affiliate levels created: 11 levels (L1=10% to L11=0.5%)');

  // ============================================================================
  // 5. Create Affiliate Ranks (Team Bonus)
  // ============================================================================
  const ranks = [
    {
      name: 'Bronze',
      icon: '🥉',
      color: '#CD7F32',
      minReferrals: 10,
      minEarnings: '100',
      bonusAmount: '50',
      commissionBoost: '1',
      perks: '["1% ROI adicional diario","Acceso a informe semanal","Soporte prioritario"]',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Prata',
      icon: '🥈',
      color: '#C0C0C0',
      minReferrals: 20,
      minEarnings: '500',
      bonusAmount: '200',
      commissionBoost: '2',
      perks: '["2% ROI adicional diario","Acceso a informe diario","Soporte VIP","Bonificación por equipo"]',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Ouro',
      icon: '🥇',
      color: '#FFD700',
      minReferrals: 30,
      minEarnings: '1000',
      bonusAmount: '500',
      commissionBoost: '3',
      perks: '["3% ROI adicional diario","Acceso a trader exclusivo","Soporte 24/7","Bonificación por equipo","Invitaciones a eventos"]',
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const rank of ranks) {
    await prisma.affiliateRank.upsert({
      where: { name: rank.name },
      update: {},
      create: rank,
    });
  }
  console.log('✅ Affiliate ranks created: Bronze, Prata, Ouro');

  // ============================================================================
  // 6. Create Copy Traders
  // ============================================================================
  const traders = [
    {
      name: 'Carlos Méndez',
      avatar: null,
      specialty: 'DeFi',
      winRate: '92',
      totalPnl: '185000',
      monthlyRoi: '180',
      riskLevel: 'medium',
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Ana Rodriguez',
      avatar: null,
      specialty: 'Arbitraje',
      winRate: '95',
      totalPnl: '320000',
      monthlyRoi: '150',
      riskLevel: 'low',
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Pedro Santos',
      avatar: null,
      specialty: 'Trading Algorítmico',
      winRate: '87',
      totalPnl: '95000',
      monthlyRoi: '120',
      riskLevel: 'medium',
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
    },
    {
      name: 'María López',
      avatar: null,
      specialty: 'Yield Farming',
      winRate: '89',
      totalPnl: '210000',
      monthlyRoi: '200',
      riskLevel: 'high',
      isActive: true,
      isFeatured: true,
      sortOrder: 4,
    },
  ];

  for (const trader of traders) {
    await prisma.copyTrader.create({
      data: trader,
    });
  }
  console.log('✅ Copy traders created: Carlos, Ana, Pedro, María');

  // ============================================================================
  // 7. Create System Configs
  // ============================================================================
  const configs = [
    // Deposit configs
    { key: 'min_deposit_usdt', value: '10', type: 'number', description: 'Depósito mínimo en USDT', category: 'deposit', isActive: true },
    { key: 'max_deposit_usdt', value: '100000', type: 'number', description: 'Depósito máximo en USDT', category: 'deposit', isActive: true },
    { key: 'pix_wallet_address', value: '', type: 'string', description: 'Dirección de billetera PIX para recibir pagos', category: 'deposit', isActive: true },
    { key: 'usdt_trc20_address', value: '', type: 'string', description: 'Dirección USDT TRC20 para recibir pagos', category: 'deposit', isActive: true },
    { key: 'usdt_polygon_address', value: '', type: 'string', description: 'Dirección USDT Polygon para recibir pagos', category: 'deposit', isActive: true },
    { key: 'pix_key', value: '', type: 'string', description: 'Clave PIX para recibir pagos', category: 'deposit', isActive: true },

    // Withdrawal configs
    { key: 'min_withdrawal_usdt', value: '10', type: 'number', description: 'Saque mínimo en USDT', category: 'withdrawal', isActive: true },
    { key: 'max_withdrawal_usdt', value: '50000', type: 'number', description: 'Saque máximo en USDT', category: 'withdrawal', isActive: true },
    { key: 'withdrawal_fee_pct', value: '0', type: 'number', description: 'Porcentaje de tarifa de retiro', category: 'withdrawal', isActive: true },

    // Affiliate configs
    { key: 'min_affiliate_withdrawal', value: '10', type: 'number', description: 'Saque mínimo de afiliado en USDT', category: 'affiliate', isActive: true },
    { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', description: 'Porcentaje de tarifa de retiro de afiliado', category: 'affiliate', isActive: true },
    { key: 'affiliate_commission_mode', value: 'system_margin', type: 'string', description: 'Modo de comisión: system_margin, investment_profit, revenue_pool', category: 'affiliate', isActive: true },
    { key: 'affiliate_system_margin_pct', value: '30', type: 'number', description: 'Porcentaje de margen del sistema para comisiones', category: 'affiliate', isActive: true },
    { key: 'affiliate_pool_revenue_pct', value: '5', type: 'number', description: 'Porcentaje del pool de ingresos para afiliados', category: 'affiliate', isActive: true },
    { key: 'affiliate_investment_bonus_pct', value: '2', type: 'number', description: 'Porcentaje de bonificación por inversión', category: 'affiliate', isActive: true },
    { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', description: 'Límite diario de comisiones (0 = sin límite)', category: 'affiliate', isActive: true },

    // Trading configs
    { key: 'trading_enabled', value: 'true', type: 'boolean', description: 'Trading habilitado', category: 'trading', isActive: true },
    { key: 'auto_compound_enabled', value: 'false', type: 'boolean', description: 'Auto-compound habilitado', category: 'trading', isActive: true },

    // NowPayments configs
    { key: 'nowpayments_enabled', value: 'false', type: 'boolean', description: 'NowPayments habilitado', category: 'deposit', isActive: true },
    { key: 'nowpayments_api_key', value: '', type: 'string', description: 'Clave API de NowPayments', category: 'deposit', isActive: true },
    { key: 'nowpayments_email', value: '', type: 'string', description: 'Email de cuenta NowPayments', category: 'deposit', isActive: true },
    { key: 'nowpayments_password', value: '', type: 'string', description: 'Contraseña de cuenta NowPayments', category: 'deposit', isActive: true },
    { key: 'nowpayments_ipn_secret', value: '', type: 'string', description: 'Secreto IPN de NowPayments', category: 'deposit', isActive: true },
    { key: 'nowpayments_base_url', value: 'https://api.nowpayments.io/v1', type: 'string', description: 'URL base de API NowPayments', category: 'deposit', isActive: true },
    { key: 'nowpayments_split_pct', value: '10', type: 'number', description: 'Porcentaje de split para plataforma', category: 'deposit', isActive: true },
    { key: 'nowpayments_split_wallet', value: '', type: 'string', description: 'Billetera de plataforma para recibir splits', category: 'deposit', isActive: true },

    // General configs
    { key: 'site_name', value: 'PLATAFORMA ROI', type: 'string', description: 'Nombre del sitio', category: 'general', isActive: true },
    { key: 'site_description', value: 'Plataforma de Copy Trading con ROI garantizado', type: 'string', description: 'Descripción del sitio', category: 'general', isActive: true },
    { key: 'support_whatsapp', value: '', type: 'string', description: 'Número de WhatsApp de soporte', category: 'general', isActive: true },

    // Team Bonus configs (AC-09, AC-10, AC-11)
    { key: 'team_bonus_salary_enabled', value: 'false', type: 'boolean', description: 'Salário semanal ativado', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_salary_pct', value: '0.5', type: 'number', description: '% do capital ativo do equipo pago semanalmente', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_salary_min_team_capital', value: '2000', type: 'number', description: 'Capital mínimo do equipo para qualificar ao salário semanal (USDT)', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_salary_requires_own_investment', value: 'true', type: 'boolean', description: 'Usuário precisa ter investimento próprio ativo para receber salário', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_gold_enabled', value: 'false', type: 'boolean', description: 'Action Gold ativado', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_gold_pct', value: '50', type: 'number', description: '% do salário semanal dos diretos que o referer recebe', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_gold_min_team_capital', value: '4000', type: 'number', description: 'Capital mínimo do equipo para qualificar ao Action Gold (USDT)', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daymond_enabled', value: 'false', type: 'boolean', description: 'Action Daymond ativado', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daymond_package_amount', value: '1000', type: 'number', description: 'Valor do pacote Daymond mensal (USDT)', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daymond_min_team_capital', value: '20000', type: 'number', description: 'Capital mínimo do equipo para qualificar ao Daymond (USDT)', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daymond_duration_days', value: '30', type: 'number', description: 'Duração do investimento Daymond em dias', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daymond_generates_commissions', value: 'false', type: 'boolean', description: 'Se o pacote Daymond gera comissões de afiliado para uplines', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_daily_cap_usd', value: '0', type: 'number', description: 'Limite diário total de bônus de equipo (0 = sem limite)', category: 'team_bonus', isActive: true },
    { key: 'team_bonus_max_depth', value: '6', type: 'number', description: 'Profundidade máxima de referidos para cálculo de capital de equipo', category: 'team_bonus', isActive: true },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('✅ System configs created: 42 config keys');

  // ============================================================================
  // 8. Create Trading Pools
  // ============================================================================
  const pools = [
    {
      name: 'Pool Arbitraje DeFi',
      totalAum: '1250000',
      dailyVolume: '45000',
      strategy: 'arbitrage',
      status: 'active',
    },
    {
      name: 'Pool Trading Algorítmico',
      totalAum: '890000',
      dailyVolume: '32000',
      strategy: 'algorithmic',
      status: 'active',
    },
  ];

  for (const pool of pools) {
    await prisma.tradingPool.create({
      data: pool,
    });
  }
  console.log('✅ Trading pools created: Pool Arbitraje DeFi, Pool Trading Algorítmico');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Admin: admin@plataformaroi.com / Admin@2026!');
  console.log('  User:  user@test.com / User@2026!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
