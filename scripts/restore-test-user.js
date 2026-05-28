#!/usr/bin/env node
/**
 * Restore test user (user@test.com) with investments and ROI history
 * after database was accidentally reset.
 * 
 * Data recovered from user's transaction history:
 *   4 investments: $10, $30, $40, $18 (total $98) in "Starter - 60 dias"
 *   4 ROI payments: $0.33, $0.99, $1.32, $0.59 (total $3.23)
 *   Final balance: -$94.77
 *   All dated: 28/05/2026
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting data restoration for user@test.com...');

  const result = await prisma.$transaction(async (tx) => {
    // ========== STEP 0: Ensure admin user exists ==========
    const adminCount = await tx.user.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      console.log('  No admin user found. Creating default admin...');
      const adminPasswordHash = bcrypt.hashSync('Admin@2026!', 12);
      await tx.user.create({
        data: {
          email: 'admin@plataformaroi.com',
          password: adminPasswordHash,
          name: 'Admin ROI',
          role: 'admin',
          isActive: true,
          balance: '0',
          affiliateBalance: '0',
          voucherBalance: '0',
          totalRoi: '0',
          totalInvested: '0',
          totalDeposited: '0',
          totalWithdrawn: '0',
          teamBonusPct: '0',
          affiliateCode: 'ADMIN01',
          hasInvested: true,
          linkUnlocked: true,
        },
      });
      console.log('  ✅ Admin created: admin@plataformaroi.com / Admin@2026!');
    }

    // ========== STEP 1: Ensure Starter plan exists with 60 days ==========
    console.log('  Ensuring Starter plan (60 days, 3.3% ROI)...');
    const starterPlan = await tx.investmentPlan.upsert({
      where: { name: 'Starter' },
      update: {
        description: 'Comece com pouco e veja seu saldo crescer a cada 24h.',
        minAmount: '5',
        maxAmount: '49.99',
        dailyRoiPct: '3.3',
        durationDays: 60,
        isActive: true,
        isFeatured: false,
        sortOrder: 1,
      },
      create: {
        name: 'Starter',
        description: 'Comece com pouco e veja seu saldo crescer a cada 24h.',
        minAmount: '5',
        maxAmount: '49.99',
        dailyRoiPct: '3.3',
        durationDays: 60,
        isActive: true,
        isFeatured: false,
        sortOrder: 1,
      },
    });
    console.log(`  ✅ Starter plan: ${starterPlan.id}`);

    // ========== STEP 1b: Ensure other plans ==========
    const otherPlans = [
      { name: 'Growth', minAmount: '50', maxAmount: '99.99', dailyRoiPct: '3.3', durationDays: 60, sortOrder: 2 },
      { name: 'Premium', minAmount: '100', maxAmount: '499.99', dailyRoiPct: '3.3', durationDays: 60, isFeatured: true, sortOrder: 3 },
      { name: 'Elite', minAmount: '500', maxAmount: '1499.99', dailyRoiPct: '3.3', durationDays: 60, isFeatured: true, sortOrder: 4 },
      { name: 'VIP', minAmount: '1500', maxAmount: null, dailyRoiPct: '3.3', durationDays: 60, isFeatured: true, sortOrder: 5 },
    ];
    for (const plan of otherPlans) {
      await tx.investmentPlan.upsert({
        where: { name: plan.name },
        update: {},
        create: {
          name: plan.name,
          description: `Plano ${plan.name} — ROI diário garantido.`,
          minAmount: plan.minAmount,
          maxAmount: plan.maxAmount,
          dailyRoiPct: plan.dailyRoiPct,
          durationDays: plan.durationDays,
          isActive: true,
          isFeatured: plan.isFeatured || false,
          sortOrder: plan.sortOrder,
        },
      });
    }
    console.log('  ✅ Other plans ensured');

    // ========== STEP 1c: Ensure affiliate levels ==========
    const levelCount = await tx.affiliateLevel.count();
    if (levelCount === 0) {
      const levels = [
        { level: 1, percentage: '5', description: 'Nível 1 - Indicação direta', isActive: true },
        { level: 2, percentage: '3', description: 'Nível 2', isActive: true },
        { level: 3, percentage: '1', description: 'Nível 3', isActive: true },
        { level: 4, percentage: '1', description: 'Nível 4', isActive: true },
        { level: 5, percentage: '1', description: 'Nível 5', isActive: true },
        { level: 6, percentage: '2', description: 'Nível 6', isActive: true },
      ];
      for (const lvl of levels) {
        await tx.affiliateLevel.create({ data: lvl });
      }
      console.log('  ✅ Created 6 affiliate levels');
    }

    // ========== STEP 1d: Ensure system configs ==========
    const configCount = await tx.systemConfig.count();
    if (configCount === 0) {
      const configs = [
        { key: 'site_name', value: 'PLATAFORMA ROI', type: 'string', description: 'Nome do site', category: 'general', isActive: true },
        { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar PIX', category: 'deposit', isActive: true },
        { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar USDT', category: 'deposit', isActive: true },
        { key: 'daily_roi_pct', value: '3.3', type: 'number', description: 'ROI diário (%)', category: 'trading', isActive: true },
        { key: 'min_deposit_usdt', value: '5', type: 'number', description: 'Depósito mínimo', category: 'deposit', isActive: true },
        { key: 'min_withdrawal_usdt', value: '5', type: 'number', description: 'Saque mínimo', category: 'withdrawal', isActive: true },
        { key: 'withdrawal_fee_pct', value: '5', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal', isActive: true },
        { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'NowPayments', category: 'nowpayments', isActive: true },
        { key: 'team_bonus_salary_enabled', value: 'true', type: 'boolean', description: 'Salário Semanal', category: 'team_bonus', isActive: true },
        { key: 'team_bonus_gold_enabled', value: 'true', type: 'boolean', description: 'Action Gold', category: 'team_bonus', isActive: true },
        { key: 'team_bonus_daymond_enabled', value: 'true', type: 'boolean', description: 'Action Daymond', category: 'team_bonus', isActive: true },
        { key: 'team_bonus_ranks_visible', value: 'true', type: 'boolean', description: 'Team Bonus Ranks visível', category: 'team_bonus', isActive: true },
      ];
      await tx.systemConfig.createMany({ data: configs });
      console.log(`  ✅ Created ${configs.length} system configs`);
    }

    // ========== STEP 2: Create or update test user ==========
    console.log('  Creating/updating test user...');
    const passwordHash = bcrypt.hashSync('User@2026!', 12);

    let user = await tx.user.findUnique({ where: { email: 'user@test.com' } });

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: 'Usuario Teste',
          password: passwordHash,
          balance: '-94.77',
          totalRoi: '3.23',
          totalInvested: '98',
          totalDeposited: '0',
          totalWithdrawn: '0',
          hasInvested: true,
          linkUnlocked: true,
        },
      });
      console.log(`  ✅ Updated user: ${user.email} (${user.id})`);
    } else {
      user = await tx.user.create({
        data: {
          email: 'user@test.com',
          name: 'Usuario Teste',
          password: passwordHash,
          role: 'user',
          isActive: true,
          balance: '-94.77',
          affiliateBalance: '0',
          voucherBalance: '0',
          totalRoi: '3.23',
          totalInvested: '98',
          totalDeposited: '0',
          totalWithdrawn: '0',
          teamBonusPct: '0',
          affiliateCode: 'TEST01',
          hasInvested: true,
          linkUnlocked: true,
        },
      });
      console.log(`  ✅ Created user: ${user.email} (${user.id})`);
    }

    const userId = user.id;

    // ========== STEP 3: Clean existing data ==========
    console.log('  Cleaning existing investments/ROI/transactions...');
    await tx.roiHistory.deleteMany({ where: { userId } });
    await tx.investment.deleteMany({ where: { userId } });
    await tx.transaction.deleteMany({ where: { userId } });

    // ========== STEP 4: Create 4 investments ==========
    console.log('  Creating 4 investments...');
    const investmentDate = new Date('2026-05-28T12:56:00-03:00');
    const roiDistributedAt = new Date('2026-05-28T13:43:00-03:00');

    const investmentData = [
      { amount: '10', dailyRoi: '0.33' },
      { amount: '30', dailyRoi: '0.99' },
      { amount: '40', dailyRoi: '1.32' },
      { amount: '18', dailyRoi: '0.594' },
    ];

    const investments = [];
    for (let i = 0; i < investmentData.length; i++) {
      const inv = investmentData[i];
      const startDate = new Date(investmentDate.getTime() + i * 60000);
      const endDate = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);

      const investment = await tx.investment.create({
        data: {
          userId,
          planId: starterPlan.id,
          amount: inv.amount,
          dailyRoi: inv.dailyRoi,
          dailyRoiPct: '3.3',
          totalRoi: (parseFloat(inv.amount) * 3.3 / 100 * 60).toFixed(2),
          accumulatedRoi: inv.dailyRoi,
          startDate,
          endDate,
          status: 'active',
          teamBonusPct: '0',
          source: 'deposit',
          lastRoiAt: roiDistributedAt,
          distributedPeriods: 1,
        },
      });
      investments.push(investment);
      console.log(`  ✅ Investment: $${inv.amount} (${investment.id})`);
    }

    // ========== STEP 5: Create ROI history ==========
    console.log('  Creating 4 ROI history records...');
    const roiRecords = [
      { idx: 0, roiAmount: '0.33', totalRoi: '0.33' },
      { idx: 1, roiAmount: '0.99', totalRoi: '0.99' },
      { idx: 2, roiAmount: '1.32', totalRoi: '1.32' },
      { idx: 3, roiAmount: '0.59', totalRoi: '0.59' },
    ];

    for (const roi of roiRecords) {
      const inv = investments[roi.idx];
      await tx.roiHistory.create({
        data: {
          userId,
          investmentId: inv.id,
          periodIndex: 1,
          distributedAt: roiDistributedAt,
          roiAmount: roi.roiAmount,
          roiPct: '3.3',
          teamBonus: '0',
          totalRoi: roi.totalRoi,
        },
      });
      console.log(`  ✅ ROI: $${roi.roiAmount} for investment $${inv.amount}`);
    }

    // ========== STEP 6: Create transactions ==========
    console.log('  Creating 8 transaction records...');
    const transactions = [
      { type: 'investment', amount: '10', desc: 'Investimento Starter - 60 dias', date: new Date('2026-05-28T12:56:00-03:00') },
      { type: 'investment', amount: '30', desc: 'Investimento Starter - 60 dias', date: new Date('2026-05-28T12:56:00-03:00') },
      { type: 'investment', amount: '40', desc: 'Investimento Starter - 60 dias', date: new Date('2026-05-28T12:57:00-03:00') },
      { type: 'investment', amount: '18', desc: 'Investimento Starter - 60 dias', date: new Date('2026-05-28T12:57:00-03:00') },
      { type: 'roi_profit', amount: '0.33', desc: 'ROI diário Starter', date: new Date('2026-05-28T13:43:00-03:00') },
      { type: 'roi_profit', amount: '0.99', desc: 'ROI diário Starter', date: new Date('2026-05-28T13:43:00-03:00') },
      { type: 'roi_profit', amount: '1.32', desc: 'ROI diário Starter', date: new Date('2026-05-28T13:43:00-03:00') },
      { type: 'roi_profit', amount: '0.59', desc: 'ROI diário Starter', date: new Date('2026-05-28T13:43:00-03:00') },
    ];

    for (const t of transactions) {
      await tx.transaction.create({
        data: {
          userId,
          type: t.type,
          amount: t.amount,
          status: 'completed',
          description: t.desc,
          createdAt: t.date,
        },
      });
    }
    console.log('  ✅ 8 transactions created');

    // ========== STEP 7: Log ==========
    const admin = await tx.user.findFirst({ where: { role: 'admin' } });
    await tx.adminLog.create({
      data: {
        adminId: admin?.id,
        action: 'create',
        entity: 'user',
        entityId: userId,
        description: `Restauração de dados do usuário teste (user@test.com) - 4 investimentos ($98) + 4 ROI ($3.23)`,
        newValue: JSON.stringify({
          userId,
          email: 'user@test.com',
          balance: '-94.77',
          totalInvested: '98',
          totalRoi: '3.23',
          investments: 4,
          roiRecords: 4,
        }),
      },
    });

    return { userId, investments: investments.length };
  }, { timeout: 30000 });

  console.log('\n🎉 Data restoration completed successfully!');
  console.log('==========================================');
  console.log('User: user@test.com / User@2026!');
  console.log('Admin: admin@plataformaroi.com / Admin@2026!');
  console.log('Balance: -$94.77');
  console.log('Investments: 4 ($10, $30, $40, $18)');
  console.log('ROI: 4 ($0.33, $0.99, $1.32, $0.59)');
  console.log('Transactions: 8');
}

main()
  .catch((e) => {
    console.error('❌ Restore failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
