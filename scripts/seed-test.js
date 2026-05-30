#!/usr/bin/env node
// ============================================================================
// ActionCash - Full Database Seed for Integration Testing
// ============================================================================
// Seeds: Admin user, Investment Plans, Affiliate Levels (11), Affiliate Ranks,
// System Configs, and a full referral network of test users
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@actioncash.app';
const ADMIN_PASSWORD = 'Admin@123456';
const TEST_PASSWORD = 'Test@123456';

// Test user hierarchy - 12 users covering 11 referral levels
const TEST_USERS = [
  { name: 'Carlos Top',     email: 'carlos@test.com',    level: 0 },  // Top of chain
  { name: 'Ana L1',         email: 'ana@test.com',       level: 1 },  // Referred by Carlos
  { name: 'Bruno L2',       email: 'bruno@test.com',     level: 2 },
  { name: 'Carla L3',       email: 'carla@test.com',     level: 3 },
  { name: 'Diego L4',       email: 'diego@test.com',     level: 4 },
  { name: 'Elena L5',       email: 'elena@test.com',     level: 5 },
  { name: 'Felipe L6',      email: 'felipe@test.com',    level: 6 },
  { name: 'Gabriela L7',    email: 'gabriela@test.com',  level: 7 },
  { name: 'Hugo L8',        email: 'hugo@test.com',      level: 8 },
  { name: 'Isabela L9',     email: 'isabela@test.com',   level: 9 },
  { name: 'Joao L10',       email: 'joao@test.com',      level: 10 },
  { name: 'Karla L11',      email: 'karla@test.com',     level: 11 },
  // Extra users at same levels for team size
  { name: 'Lucas Extra',    email: 'lucas@test.com',     level: 1 },  // Also referred by Carlos
  { name: 'Maria Extra',    email: 'maria@test.com',     level: 1 },  // Also referred by Carlos
  { name: 'NoInvest L1',    email: 'noinvest@test.com',  level: 1 },  // Referred by Carlos but NO investment
  { name: 'Pedro NoInv L2', email: 'pedro@test.com',     level: 2 },  // Referred by Ana, NO investment
];

async function main() {
  console.log('🌱 Seeding ActionCash test database...\n');

  // ── 1. Clean existing data ──────────────────────────────────────────
  console.log('🧹 Cleaning existing data...');
  const tables = [
    'Transaction', 'AffiliateCommission', 'Transfer', 'Deposit',
    'Investment', 'WeeklySalary', 'ActionGoldPayment', 'DaymondPackage',
    'VoucherUsage', 'Voucher', 'AffiliateMilestone', 'AffiliateContest',
    'AffiliateBadge', 'AdminLog',
  ];
  for (const t of tables) {
    try { await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`); } catch {}
  }
  await prisma.affiliateLevel.deleteMany();
  await prisma.affiliateRank.deleteMany();
  await prisma.investmentPlan.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log('   ✅ Cleaned\n');

  // ── 2. Create Admin User ────────────────────────────────────────────
  console.log('👤 Creating admin user...');
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: adminHash,
      name: 'Admin ActionCash',
      role: 'admin',
      isActive: true,
      affiliateCode: 'ADMIN01',
      hasInvested: false,
      linkUnlocked: true,
    },
  });
  console.log(`   ✅ Admin: ${admin.email} (id: ${admin.id})\n`);

  // ── 3. Create Investment Plans ──────────────────────────────────────
  console.log('📊 Creating investment plans...');
  const plans = await Promise.all([
    prisma.investmentPlan.create({
      data: {
        name: 'Starter',
        description: 'Plano inicial para começar a investir',
        minAmount: '5',
        maxAmount: '99',
        dailyRoiPct: '3.3',
        durationDays: 60,
        isActive: true,
        isFeatured: true,
        sortOrder: 1,
      },
    }),
    prisma.investmentPlan.create({
      data: {
        name: 'Growth',
        description: 'Plano de crescimento acelerado',
        minAmount: '100',
        maxAmount: '999',
        dailyRoiPct: '3.3',
        durationDays: 60,
        isActive: true,
        isFeatured: true,
        sortOrder: 2,
      },
    }),
    prisma.investmentPlan.create({
      data: {
        name: 'Elite',
        description: 'Plano elite para investidores experientes',
        minAmount: '1000',
        maxAmount: '100000',
        dailyRoiPct: '3.3',
        durationDays: 60,
        isActive: true,
        isFeatured: true,
        sortOrder: 3,
      },
    }),
  ]);
  plans.forEach(p => console.log(`   ✅ ${p.name}: $${p.minAmount}-$${p.maxAmount} @ ${p.dailyRoiPct}%/${p.durationDays}d`));
  console.log();

  // ── 4. Create Affiliate Levels (11 levels) ──────────────────────────
  console.log('🔗 Creating affiliate levels...');
  const levelPcts = [
    { level: 1, pct: '10' },
    { level: 2, pct: '4' },
    { level: 3, pct: '3' },
    { level: 4, pct: '2' },
    { level: 5, pct: '1.5' },
    { level: 6, pct: '1' },
    { level: 7, pct: '0.8' },
    { level: 8, pct: '0.5' },
    { level: 9, pct: '0.4' },
    { level: 10, pct: '0.3' },
    { level: 11, pct: '0.5' },
  ];
  for (const l of levelPcts) {
    await prisma.affiliateLevel.create({
      data: {
        level: l.level,
        percentage: l.pct,
        description: `Level ${l.level} - ${l.pct}% commission`,
        isActive: true,
      },
    });
  }
  console.log(`   ✅ Created ${levelPcts.length} affiliate levels (total: ${levelPcts.reduce((s, l) => s + parseFloat(l.pct), 0)}%)\n`);

  // ── 5. Create Affiliate Ranks ───────────────────────────────────────
  console.log('🏆 Creating affiliate ranks...');
  const ranks = await Promise.all([
    prisma.affiliateRank.create({
      data: {
        name: 'Bronze',
        icon: '🥉',
        color: 'text-amber-600',
        minReferrals: 5,
        minEarnings: '100',
        bonusAmount: '50',
        commissionBoost: '1',
        perks: '1% commission boost',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.affiliateRank.create({
      data: {
        name: 'Prata',
        icon: '🥈',
        color: 'text-zinc-300',
        minReferrals: 10,
        minEarnings: '500',
        bonusAmount: '200',
        commissionBoost: '2',
        perks: '2% commission boost',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.affiliateRank.create({
      data: {
        name: 'Ouro',
        icon: '🥇',
        color: 'text-yellow-400',
        minReferrals: 20,
        minEarnings: '2000',
        bonusAmount: '500',
        commissionBoost: '3',
        perks: '3% commission boost + priority support',
        sortOrder: 3,
        isActive: true,
      },
    }),
  ]);
  ranks.forEach(r => console.log(`   ✅ ${r.icon} ${r.name}: ${r.minReferrals}+ refs, +${r.commissionBoost}% boost`));
  console.log();

  // ── 6. Create System Configs ────────────────────────────────────────
  console.log('⚙️ Creating system configs...');
  const configs = [
    // General
    { key: 'site_name', value: 'ActionCash', type: 'string', category: 'general', description: 'Nome do site' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'general', description: 'Modo manutenção' },
    { key: 'usdt_brl_rate', value: '5.70', type: 'number', category: 'general', description: 'Câmbio USDT/BRL' },
    // Deposit
    { key: 'has_pix', value: 'true', type: 'boolean', category: 'deposit', description: 'PIX habilitado' },
    { key: 'has_usdt', value: 'true', type: 'boolean', category: 'deposit', description: 'USDT habilitado' },
    { key: 'manual_deposit_enabled', value: 'true', type: 'boolean', category: 'deposit', description: 'Depósito manual' },
    { key: 'min_deposit_usdt', value: '5', type: 'number', category: 'deposit', description: 'Depósito mínimo' },
    { key: 'max_deposit_usdt', value: '100000', type: 'number', category: 'deposit', description: 'Depósito máximo' },
    { key: 'pix_key', value: 'test@actioncash.app', type: 'string', category: 'deposit', description: 'Chave PIX' },
    { key: 'usdt_trc20_address', value: 'TTestNetAddress123456789', type: 'string', category: 'deposit', description: 'USDT TRC20' },
    { key: 'usdt_polygon_address', value: '0xTestPolygonAddress12345', type: 'string', category: 'deposit', description: 'USDT Polygon' },
    // Withdrawal
    { key: 'manual_withdrawal_enabled', value: 'true', type: 'boolean', category: 'withdrawal', description: 'Saque manual' },
    { key: 'min_withdrawal_usdt', value: '5', type: 'number', category: 'withdrawal', description: 'Saque mínimo' },
    { key: 'max_withdrawal_usdt', value: '50000', type: 'number', category: 'withdrawal', description: 'Saque máximo' },
    { key: 'withdrawal_fee_pct', value: '0', type: 'number', category: 'withdrawal', description: 'Taxa de saque' },
    { key: 'withdrawal_interval_hours', value: '0', type: 'number', category: 'withdrawal', description: 'Intervalo saques' },
    // Affiliate
    { key: 'affiliate_commission_mode', value: 'system_margin', type: 'string', category: 'affiliate', description: 'Modo comissão' },
    { key: 'affiliate_system_margin_pct', value: '30', type: 'number', category: 'affiliate', description: 'Margem do sistema' },
    { key: 'affiliate_daily_cap_usd', value: '0', type: 'number', category: 'affiliate', description: 'Cap diário' },
    { key: 'affiliate_link_requires_investment', value: 'true', type: 'boolean', category: 'affiliate', description: 'Link exige investimento' },
    { key: 'min_affiliate_withdrawal', value: '5', type: 'number', category: 'affiliate', description: 'Saque mínimo afiliado' },
    { key: 'affiliate_withdrawal_fee_pct', value: '0', type: 'number', category: 'affiliate', description: 'Taxa saque afiliado' },
    // Transfer
    { key: 'transfer_enabled', value: 'true', type: 'boolean', category: 'transfer', description: 'Transferências' },
    { key: 'transfer_min', value: '1', type: 'number', category: 'transfer', description: 'Transferência mínima' },
    { key: 'transfer_max', value: '0', type: 'number', category: 'transfer', description: 'Transferência máxima' },
    { key: 'transfer_fee_pct', value: '1', type: 'number', category: 'transfer', description: 'Taxa transferência' },
    { key: 'transfer_daily_limit', value: '10', type: 'number', category: 'transfer', description: 'Limite diário' },
    { key: 'transfer_cooldown_min', value: '0', type: 'number', category: 'transfer', description: 'Cooldown' },
    // Team Bonus
    { key: 'team_bonus_salary_enabled', value: 'true', type: 'boolean', category: 'team_bonus', description: 'Salary enabled' },
    { key: 'team_bonus_salary_pct', value: '0.5', type: 'number', category: 'team_bonus', description: 'Salary %' },
    { key: 'team_bonus_salary_min_team_capital', value: '2000', type: 'number', category: 'team_bonus', description: 'Salary min capital' },
    { key: 'team_bonus_gold_enabled', value: 'true', type: 'boolean', category: 'team_bonus', description: 'Gold enabled' },
    { key: 'team_bonus_gold_pct', value: '50', type: 'number', category: 'team_bonus', description: 'Gold %' },
    { key: 'team_bonus_gold_min_team_capital', value: '4000', type: 'number', category: 'team_bonus', description: 'Gold min capital' },
    { key: 'team_bonus_daymond_enabled', value: 'true', type: 'boolean', category: 'team_bonus', description: 'Daymond enabled' },
    { key: 'team_bonus_daymond_package_amount', value: '1000', type: 'number', category: 'team_bonus', description: 'Daymond amount' },
    { key: 'team_bonus_daymond_min_team_capital', value: '20000', type: 'number', category: 'team_bonus', description: 'Daymond min capital' },
    { key: 'team_bonus_daymond_duration_days', value: '30', type: 'number', category: 'team_bonus', description: 'Daymond duration' },
    { key: 'team_bonus_daymond_premium_enabled', value: 'true', type: 'boolean', category: 'team_bonus', description: 'Daymond Premium enabled' },
    { key: 'team_bonus_daymond_premium_package_amount', value: '2000', type: 'number', category: 'team_bonus', description: 'DP amount' },
    { key: 'team_bonus_daymond_premium_min_team_capital', value: '50000', type: 'number', category: 'team_bonus', description: 'DP min capital' },
    { key: 'team_bonus_daymond_premium_daily_roi_pct', value: '3.3', type: 'number', category: 'team_bonus', description: 'DP daily ROI' },
    { key: 'team_bonus_daymond_premium_daily_cap_usd', value: '99', type: 'number', category: 'team_bonus', description: 'DP daily cap' },
    { key: 'team_bonus_max_depth', value: '6', type: 'number', category: 'team_bonus', description: 'Max depth' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.create({
      data: { ...c, isActive: true },
    });
  }
  console.log(`   ✅ Created ${configs.length} system configs\n`);

  // ── 7. Create Test User Network ─────────────────────────────────────
  console.log('👥 Creating test user referral network...');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const createdUsers = [];
  const userByLevel = {}; // level -> [users]

  for (const u of TEST_USERS) {
    // Determine referrer
    let referredBy = null;
    if (u.level > 0) {
      // Referred by the user at level-1 (first one found)
      const referrerLevel = u.level - 1;
      const referrers = userByLevel[referrerLevel];
      if (referrers && referrers.length > 0) {
        referredBy = referrers[0].id;
      }
    }

    // Generate affiliate code from name
    const codeBase = u.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6);
    const codeRand = Math.random().toString(36).toUpperCase().slice(2, 6);
    const affiliateCode = codeBase + codeRand;

    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: passwordHash,
        name: u.name,
        role: 'user',
        isActive: true,
        affiliateCode,
        referredBy,
        hasInvested: false,
        linkUnlocked: false,
      },
    });

    createdUsers.push(user);
    if (!userByLevel[u.level]) userByLevel[u.level] = [];
    userByLevel[u.level].push(user);

    const refLabel = referredBy ? `← referred by ${referredBy}` : '(TOP)';
    console.log(`   ✅ L${u.level} ${u.name} (${u.email}) code=${affiliateCode} ${refLabel}`);
  }
  console.log();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('🌱 SEED COMPLETE!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Test users: ${TEST_PASSWORD} (all share same password)`);
  console.log(`Users: ${createdUsers.length + 1} total`);
  console.log(`Plans: ${plans.length}`);
  console.log(`Levels: ${levelPcts.length}`);
  console.log(`Ranks: ${ranks.length}`);
  console.log(`Configs: ${configs.length}`);
  console.log();
  console.log('Referral chain:');
  for (let i = 0; i <= 11; i++) {
    const users = userByLevel[i] || [];
    users.forEach(u => {
      const ref = u.referredBy ? `← ${userByLevel[i-1]?.[0]?.affiliateCode || '?'}` : '';
      console.log(`  L${i}: ${u.name} (${u.affiliateCode}) ${ref}`);
    });
  }
  console.log('═══════════════════════════════════════════════════');

  // Return user map for the test script
  return { admin, createdUsers, userByLevel, plans };
}

main()
  .then((result) => {
    // Output user IDs for test script
    if (result) {
      console.log('\n📋 USER_ID_MAP for test script:');
      result.createdUsers.forEach(u => {
        console.log(`  ${u.email}=${u.id}`);
      });
      console.log(`  ${ADMIN_EMAIL}=${result.admin.id}`);
    }
  })
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
