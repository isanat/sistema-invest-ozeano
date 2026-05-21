import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-utils';

// ============================================================================
// ADMIN RESET & SEED - Zero all data except user names, then repopulate
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const confirm = body.confirm === true;
    if (!confirm) {
      return apiError('Confirme a operação enviando { confirm: true }');
    }

    console.log('[RESET-SEED] Starting database reset...');

    // ========== STEP 1: Delete all dependent data (order matters for FK constraints) ==========
    console.log('[RESET-SEED] Step 1: Deleting dependent records...');

    // Affiliate claims and awards
    await db.affiliateMilestoneClaim.deleteMany();
    console.log('[RESET-SEED]   - AffiliateMilestoneClaim deleted');

    await db.affiliateBadgeAward.deleteMany();
    console.log('[RESET-SEED]   - AffiliateBadgeAward deleted');

    // Affiliate commissions and withdrawals
    await db.affiliateCommission.deleteMany();
    console.log('[RESET-SEED]   - AffiliateCommission deleted');

    await db.affiliateWithdrawal.deleteMany();
    console.log('[RESET-SEED]   - AffiliateWithdrawal deleted');

    // NowPayments records
    await db.nowPaymentsWebhookLog.deleteMany();
    console.log('[RESET-SEED]   - NowPaymentsWebhookLog deleted');

    await db.nowPaymentsPayout.deleteMany();
    console.log('[RESET-SEED]   - NowPaymentsPayout deleted');

    await db.nowPaymentsDeposit.deleteMany();
    console.log('[RESET-SEED]   - NowPaymentsDeposit deleted');

    await db.nowPaymentsSubAccount.deleteMany();
    console.log('[RESET-SEED]   - NowPaymentsSubAccount deleted');

    // Voucher usages then vouchers (VoucherUsage has FK to Voucher and Investment)
    await db.voucherUsage.deleteMany();
    console.log('[RESET-SEED]   - VoucherUsage deleted');

    // Transactions
    await db.transaction.deleteMany();
    console.log('[RESET-SEED]   - Transaction deleted');

    // Deposits
    await db.deposit.deleteMany();
    console.log('[RESET-SEED]   - Deposit deleted');

    // ROI History and Investments (RoiHistory cascades from Investment, but delete explicitly)
    await db.roiHistory.deleteMany();
    console.log('[RESET-SEED]   - RoiHistory deleted');

    await db.investment.deleteMany();
    console.log('[RESET-SEED]   - Investment deleted');

    // Vouchers
    await db.voucher.deleteMany();
    console.log('[RESET-SEED]   - Voucher deleted');

    // Admin logs
    await db.adminLog.deleteMany();
    console.log('[RESET-SEED]   - AdminLog deleted');

    // ========== STEP 2: Delete seed/configuration tables ==========
    console.log('[RESET-SEED] Step 2: Deleting configuration records...');

    await db.affiliateMilestone.deleteMany();
    console.log('[RESET-SEED]   - AffiliateMilestone deleted');

    await db.affiliateBadge.deleteMany();
    console.log('[RESET-SEED]   - AffiliateBadge deleted');

    await db.affiliateContest.deleteMany();
    console.log('[RESET-SEED]   - AffiliateContest deleted');

    await db.affiliateRank.deleteMany();
    console.log('[RESET-SEED]   - AffiliateRank deleted');

    await db.affiliateLevel.deleteMany();
    console.log('[RESET-SEED]   - AffiliateLevel deleted');

    await db.investmentPlan.deleteMany();
    console.log('[RESET-SEED]   - InvestmentPlan deleted');

    await db.copyTrader.deleteMany();
    console.log('[RESET-SEED]   - CopyTrader deleted');

    await db.tradingPool.deleteMany();
    console.log('[RESET-SEED]   - TradingPool deleted');

    await db.bitgetTraderCache.deleteMany();
    console.log('[RESET-SEED]   - BitgetTraderCache deleted');

    await db.systemConfig.deleteMany();
    console.log('[RESET-SEED]   - SystemConfig deleted');

    // ========== STEP 3: Reset user balances but keep user records ==========
    console.log('[RESET-SEED] Step 3: Resetting user balances...');

    await db.user.updateMany({
      data: {
        balance: '0',
        affiliateBalance: '0',
        voucherBalance: '0',
        totalRoi: '0',
        totalInvested: '0',
        totalWithdrawn: '0',
        teamBonusPct: '0',
        totalAffiliateEarnings: '0',
        hasInvested: false,
        linkUnlocked: false,
      },
    });
    console.log('[RESET-SEED]   - User balances reset to 0');

    // Restore admin users' hasInvested and linkUnlocked so they can manage affiliate system
    await db.user.updateMany({
      where: { role: 'admin' },
      data: { hasInvested: true, linkUnlocked: true },
    });
    console.log('[RESET-SEED]   - Admin user flags restored (hasInvested=true, linkUnlocked=true)');

    // ========== STEP 4: Seed SystemConfig ==========
    console.log('[RESET-SEED] Step 4: Seeding SystemConfig...');

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
      { key: 'nowpayments_split_pct', value: '0', type: 'number', description: 'Split da Plataforma (%)', category: 'nowpayments' },
      { key: 'nowpayments_split_wallet', value: '', type: 'string', description: 'Carteira de Split', category: 'nowpayments' },
    ];

    await db.systemConfig.createMany({ data: configs });
    console.log(`[RESET-SEED]   - ${configs.length} SystemConfig entries created`);

    // ========== STEP 5: Seed Affiliate Levels (11-level unilevel) ==========
    console.log('[RESET-SEED] Step 5: Seeding Affiliate Levels...');

    const affiliateLevels = [
      { level: 1, percentage: '10', description: 'Nível 1 - Indicação direta', isActive: true },
      { level: 2, percentage: '4', description: 'Nível 2', isActive: true },
      { level: 3, percentage: '3', description: 'Nível 3', isActive: true },
      { level: 4, percentage: '2', description: 'Nível 4', isActive: true },
      { level: 5, percentage: '1.5', description: 'Nível 5', isActive: true },
      { level: 6, percentage: '1', description: 'Nível 6', isActive: true },
      { level: 7, percentage: '0.8', description: 'Nível 7', isActive: true },
      { level: 8, percentage: '0.5', description: 'Nível 8', isActive: true },
      { level: 9, percentage: '0.4', description: 'Nível 9', isActive: true },
      { level: 10, percentage: '0.3', description: 'Nível 10', isActive: true },
      { level: 11, percentage: '0.5', description: 'Nível 11', isActive: true },
    ];

    await db.affiliateLevel.createMany({ data: affiliateLevels });
    console.log(`[RESET-SEED]   - ${affiliateLevels.length} Affiliate Levels created`);

    // ========== STEP 6: Seed Investment Plans ==========
    console.log('[RESET-SEED] Step 6: Seeding Investment Plans...');

    const plans = [
      {
        name: 'Starter',
        description: 'Comece com pouco e veja seu saldo crescer a cada 24h. Ideal para quem está começando no mundo dos investimentos digitais.',
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
        description: 'Dobre seu capital em até 40 dias com ROI diário garantido. Perfeito para quem busca crescimento consistente.',
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
        description: 'O plano mais popular! Rendimento diário garantido com os melhores traders do mercado. Seu dinheiro trabalhando 24/7.',
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
        description: 'Para investidores experientes que buscam maximizar ganhos. Acesso prioritário às melhores estratégias de copy trading.',
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
        description: 'Exclusivo para grandes investidores. Retorno máximo com suporte VIP e acesso antecipado a novas estratégias de trading.',
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
    console.log(`[RESET-SEED]   - ${plans.length} Investment Plans created`);

    // ========== STEP 7: Seed Affiliate Ranks ==========
    console.log('[RESET-SEED] Step 7: Seeding Affiliate Ranks...');

    const affiliateRanks = [
      {
        name: 'Bronze',
        icon: '\u{1F949}',
        color: '#CD7F32',
        minReferrals: 1,
        minEarnings: '0',
        bonusAmount: '5',
        commissionBoost: '1',
        perks: JSON.stringify(['Acesso ao programa de afiliados', 'Team Bonus +1% ROI diário', 'Suporte básico']),
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Prata',
        icon: '\u{1F948}',
        color: '#C0C0C0',
        minReferrals: 5,
        minEarnings: '50',
        bonusAmount: '25',
        commissionBoost: '2',
        perks: JSON.stringify(['B\u00F4nus de $25', 'Team Bonus +2% ROI di\u00E1rio', 'Aumento de comiss\u00E3o', 'Suporte priorit\u00E1rio']),
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Ouro',
        icon: '\u{1F947}',
        color: '#FFD700',
        minReferrals: 15,
        minEarnings: '200',
        bonusAmount: '75',
        commissionBoost: '3',
        perks: JSON.stringify(['B\u00F4nus de $75', 'Team Bonus +3% ROI di\u00E1rio', 'Suporte VIP', 'Acesso antecipado a novos recursos']),
        sortOrder: 3,
        isActive: true,
      },
    ];

    await db.affiliateRank.createMany({ data: affiliateRanks });
    console.log(`[RESET-SEED]   - ${affiliateRanks.length} Affiliate Ranks created`);

    // ========== STEP 8: Seed Affiliate Badges ==========
    console.log('[RESET-SEED] Step 8: Seeding Affiliate Badges...');

    const badges = [
      {
        name: 'Primeiro Investimento',
        description: 'Fez seu primeiro investimento na plataforma',
        icon: '\u{1F331}',
        color: '#4CAF50',
        category: 'investment',
        requirement: JSON.stringify({ type: 'first_investment' }),
        rewardType: 'none',
        rewardValue: '0',
        isAuto: true,
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Primeiro Indicado',
        description: 'Conseguiu sua primeira indicação ativa',
        icon: '\u{1F91D}',
        color: '#2196F3',
        category: 'recruitment',
        requirement: JSON.stringify({ type: 'referrals', count: 1 }),
        rewardType: 'none',
        rewardValue: '0',
        isAuto: true,
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Rede em Crescimento',
        description: 'Conquistou 5 indicações ativas na sua rede',
        icon: '\u{1F4C8}',
        color: '#FF9800',
        category: 'recruitment',
        requirement: JSON.stringify({ type: 'referrals', count: 5 }),
        rewardType: 'cash',
        rewardValue: '10',
        isAuto: true,
        sortOrder: 3,
        isActive: true,
      },
      {
        name: 'Top Recrutador',
        description: 'Alcançou 10 indicações ativas - você é um líder!',
        icon: '\u{1F3C6}',
        color: '#9C27B0',
        category: 'recruitment',
        requirement: JSON.stringify({ type: 'referrals', count: 10 }),
        rewardType: 'cash',
        rewardValue: '25',
        isAuto: true,
        sortOrder: 4,
        isActive: true,
      },
      {
        name: 'Diamond Network',
        description: 'Construiu uma rede de 25 indicações ativas - incrível!',
        icon: '\u{1F48E}',
        color: '#00BCD4',
        category: 'recruitment',
        requirement: JSON.stringify({ type: 'referrals', count: 25 }),
        rewardType: 'cash',
        rewardValue: '100',
        isAuto: true,
        sortOrder: 5,
        isActive: true,
      },
      {
        name: 'Investidor Bronze',
        description: 'Total investido atingiu $100 USDT',
        icon: '\u{1F6E1}\u{FE0F}',
        color: '#CD7F32',
        category: 'earnings',
        requirement: JSON.stringify({ type: 'total_invested', amount: 100 }),
        rewardType: 'none',
        rewardValue: '0',
        isAuto: true,
        sortOrder: 6,
        isActive: true,
      },
      {
        name: 'Investidor Prata',
        description: 'Total investido atingiu $1.000 USDT',
        icon: '\u{1F6E1}\u{FE0F}',
        color: '#C0C0C0',
        category: 'earnings',
        requirement: JSON.stringify({ type: 'total_invested', amount: 1000 }),
        rewardType: 'cash',
        rewardValue: '15',
        isAuto: true,
        sortOrder: 7,
        isActive: true,
      },
      {
        name: 'Investidor Ouro',
        description: 'Total investido atingiu $10.000 USDT - elite dos investidores!',
        icon: '\u{1F6E1}\u{FE0F}',
        color: '#FFD700',
        category: 'earnings',
        requirement: JSON.stringify({ type: 'total_invested', amount: 10000 }),
        rewardType: 'cash',
        rewardValue: '50',
        isAuto: true,
        sortOrder: 8,
        isActive: true,
      },
    ];

    await db.affiliateBadge.createMany({ data: badges });
    console.log(`[RESET-SEED]   - ${badges.length} Affiliate Badges created`);

    // ========== STEP 9: Seed Affiliate Milestones ==========
    console.log('[RESET-SEED] Step 9: Seeding Affiliate Milestones...');

    const milestones = [
      {
        name: '5 Indica\u00E7\u00F5es Ativas',
        description: 'Conquiste 5 indica\u00E7\u00F5es com investimento ativo e ganhe $25 USDT',
        targetCount: 5,
        rewardType: 'cash',
        rewardValue: '25',
        icon: '\u{1F3AF}',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: '10 Indica\u00E7\u00F5es Ativas',
        description: 'Conquiste 10 indica\u00E7\u00F5es com investimento ativo e ganhe $50 USDT',
        targetCount: 10,
        rewardType: 'cash',
        rewardValue: '50',
        icon: '\u{1F3C5}',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: '25 Indica\u00E7\u00F5es Ativas',
        description: 'Conquiste 25 indica\u00E7\u00F5es com investimento ativo e ganhe $150 USDT',
        targetCount: 25,
        rewardType: 'cash',
        rewardValue: '150',
        icon: '\u{2B50}',
        isActive: true,
        sortOrder: 3,
      },
    ];

    await db.affiliateMilestone.createMany({ data: milestones });
    console.log(`[RESET-SEED]   - ${milestones.length} Affiliate Milestones created`);

    // ========== STEP 10: Seed Copy Traders ==========
    console.log('[RESET-SEED] Step 10: Seeding Copy Traders...');

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
    console.log(`[RESET-SEED]   - ${copyTraders.length} Copy Traders created`);

    // ========== STEP 11: Seed Trading Pools ==========
    console.log('[RESET-SEED] Step 11: Seeding Trading Pools...');

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
    console.log(`[RESET-SEED]   - ${tradingPools.length} Trading Pools created`);

    // ========== STEP 12: Log the reset action ==========
    await db.adminLog.create({
      data: {
        adminId: session.userId,
        action: 'create',
        entity: 'system',
        description: 'Banco de dados resetado e populado com sucesso (reset-seed)',
        newValue: JSON.stringify({
          configs: configs.length,
          affiliateLevels: affiliateLevels.length,
          plans: plans.length,
          affiliateRanks: affiliateRanks.length,
          badges: badges.length,
          milestones: milestones.length,
          copyTraders: copyTraders.length,
          tradingPools: tradingPools.length,
        }),
      },
    });

    console.log('[RESET-SEED] Database reset and seed completed successfully!');

    return apiSuccess({
      message: 'Banco de dados resetado e populado com sucesso!',
      seeded: {
        configs: configs.length,
        affiliateLevels: affiliateLevels.length,
        plans: plans.length,
        affiliateRanks: affiliateRanks.length,
        badges: badges.length,
        milestones: milestones.length,
        copyTraders: copyTraders.length,
        tradingPools: tradingPools.length,
      },
    }, 201);
  } catch (error) {
    console.error('[RESET-SEED] Error:', error);
    return handleApiError(error);
  }
}
