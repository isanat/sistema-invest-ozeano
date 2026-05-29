import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError, getIpFromRequest } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';

// ============================================================================
// ADMIN RESTORE USER - Restore test user (user@test.com) with their investments & ROI
// ============================================================================
// Data recovered from user's transaction history:
//   4 investments: $10, $30, $40, $18 (total $98) in "Starter - 60 dias"
//   4 ROI payments: $0.33, $0.99, $1.32, $0.59 (total $3.23)
//   Final balance: -$94.77
//   All dated: 28/05/2026
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET || '';

function authenticate(request: NextRequest): boolean {
  // Method 1: Admin session
  // (will be checked via requireAdmin below)

  // Method 2: CRON_SECRET via query param or Bearer token
  const urlSecret = request.nextUrl.searchParams.get('secret');
  if (urlSecret && urlSecret === CRON_SECRET && CRON_SECRET) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET) return true;

  // Method 3: In development without CRON_SECRET
  if (process.env.NODE_ENV === 'development' && !CRON_SECRET) return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Try to authenticate: either via CRON_SECRET or admin session
    let isAdmin = false;
    let adminId: string | undefined;

    if (authenticate(request)) {
      isAdmin = true;
    } else {
      try {
        const session = await requireAdmin();
        isAdmin = true;
        adminId = session.userId;
      } catch {
        // Not admin
      }
    }

    if (!isAdmin) {
      return apiError('Não autorizado. Use CRON_SECRET ou login de admin.', 401);
    }

    const body = await request.json().catch(() => ({}));
    const confirm = body.confirm === true;
    if (!confirm) {
      return apiError('Confirme a operação enviando { confirm: true }');
    }

    // Optional: override user email/name/password
    const userEmail = body.email || 'user@test.com';
    const userName = body.name || 'Usuario Teste';
    const userPassword = body.password || 'User@2026!';

    console.info('[RESTORE] Starting data restoration for user test...');

    await db.$transaction(async (tx) => {
      // ========== STEP 0: Ensure admin user exists (in case DB was fully reset) ==========
      const adminCount = await tx.user.count({ where: { role: { in: ['admin', 'super_admin'] } } });
      if (adminCount === 0) {
        console.info('[RESTORE] No admin user found. Creating default admin...');
        const adminPasswordHash = bcrypt.hashSync('Admin@2026!', 12);
        await tx.user.create({
          data: {
            email: 'admin@plataformaroi.com',
            password: adminPasswordHash,
            name: 'Admin ROI',
            role: 'super_admin',
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
        console.info('[RESTORE] Admin user created: admin@plataformaroi.com / Admin@2026!');
      }

      // ========== STEP 1: Ensure Starter plan exists with 60 days ==========
      console.info('[RESTORE] Step 1: Ensuring Starter plan...');

      const starterPlan = await tx.investmentPlan.upsert({
        where: { name: 'Starter' },
        update: {
          description: 'Comece com pouco e veja seu saldo crescer a cada 24h. Ideal para quem está começando no mundo dos investimentos digitais.',
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
          description: 'Comece com pouco e veja seu saldo crescer a cada 24h. Ideal para quem está começando no mundo dos investimentos digitais.',
          minAmount: '5',
          maxAmount: '49.99',
          dailyRoiPct: '3.3',
          durationDays: 60,
          isActive: true,
          isFeatured: false,
          sortOrder: 1,
        },
      });

      console.info(`[RESTORE] Starter plan ensured: ${starterPlan.id} (durationDays: ${starterPlan.durationDays})`);

      // ========== STEP 1b: Ensure other plans exist ==========
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

      // ========== STEP 1c: Ensure affiliate levels exist ==========
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
        console.info('[RESTORE] Created 6 affiliate levels');
      }

      // ========== STEP 1d: Ensure system configs exist ==========
      const configCount = await tx.systemConfig.count();
      if (configCount === 0) {
        const configs = [
          { key: 'site_name', value: 'ActionCash', type: 'string', description: 'Nome do site', category: 'general', isActive: true },
          { key: 'has_pix', value: 'false', type: 'boolean', description: 'Ativar depósito via PIX', category: 'deposit', isActive: true },
          { key: 'has_usdt', value: 'true', type: 'boolean', description: 'Ativar depósito via USDT', category: 'deposit', isActive: true },
          { key: 'daily_roi_pct', value: '3.3', type: 'number', description: 'ROI diário padrão (%)', category: 'trading', isActive: true },
          { key: 'min_deposit_usdt', value: '5', type: 'number', description: 'Depósito mínimo USDT', category: 'deposit', isActive: true },
          { key: 'min_withdrawal_usdt', value: '5', type: 'number', description: 'Saque mínimo USDT', category: 'withdrawal', isActive: true },
          { key: 'withdrawal_fee_pct', value: '5', type: 'number', description: 'Taxa de saque (%)', category: 'withdrawal', isActive: true },
          { key: 'nowpayments_enabled', value: 'true', type: 'boolean', description: 'Ativar depósito automático via NowPayments', category: 'nowpayments', isActive: true },
          { key: 'team_bonus_salary_enabled', value: 'true', type: 'boolean', description: 'Ativar Salário Semanal', category: 'team_bonus', isActive: true },
          { key: 'team_bonus_gold_enabled', value: 'true', type: 'boolean', description: 'Ativar Action Gold', category: 'team_bonus', isActive: true },
          { key: 'team_bonus_daymond_enabled', value: 'true', type: 'boolean', description: 'Ativar Action Daymond', category: 'team_bonus', isActive: true },
          { key: 'team_bonus_ranks_visible', value: 'true', type: 'boolean', description: 'Mostrar card de Team Bonus Ranks', category: 'team_bonus', isActive: true },
        ];
        await tx.systemConfig.createMany({ data: configs });
        console.info(`[RESTORE] Created ${configs.length} system configs`);
      }

      // ========== STEP 2: Create or update test user ==========
      console.info('[RESTORE] Step 2: Creating/updating test user...');

      const passwordHash = bcrypt.hashSync(userPassword, 12);

      // Check if user exists by email
      let user = await tx.user.findUnique({ where: { email: userEmail } });

      if (user) {
        // Update existing user
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: userName,
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
        console.info(`[RESTORE] Updated existing user: ${user.email} (id: ${user.id})`);
      } else {
        // Create new user
        user = await tx.user.create({
          data: {
            email: userEmail,
            name: userName,
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
        console.info(`[RESTORE] Created new user: ${user.email} (id: ${user.id})`);
      }

      const userId = user.id;

      // ========== STEP 3: Delete any existing investments/ROI for this user ==========
      console.info('[RESTORE] Step 3: Cleaning existing investments...');

      await tx.roiHistory.deleteMany({ where: { userId } });
      await tx.investment.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });

      // ========== STEP 4: Create 4 investments ==========
      console.info('[RESTORE] Step 4: Creating investments...');

      // All investments were made on 28/05/2026
      const investmentDate = new Date('2026-05-28T12:56:00-03:00');
      const roiDistributedAt = new Date('2026-05-28T13:43:00-03:00');

      const investmentData = [
        { amount: '10', dailyRoi: '0.33' },
        { amount: '30', dailyRoi: '0.99' },
        { amount: '40', dailyRoi: '1.32' },
        { amount: '18', dailyRoi: '0.594' },
      ];

      const investments: { id: string; amount: string; dailyRoi: string }[] = [];

      for (let i = 0; i < investmentData.length; i++) {
        const inv = investmentData[i];
        const startDate = new Date(investmentDate.getTime() + i * 60000); // 1 min apart
        const endDate = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

        const investment = await tx.investment.create({
          data: {
            userId,
            planId: starterPlan.id,
            amount: inv.amount,
            dailyRoi: inv.dailyRoi,
            dailyRoiPct: '3.3',
            totalRoi: (parseFloat(inv.amount) * 3.3 / 100 * 60).toFixed(2), // total expected ROI over 60 days
            accumulatedRoi: inv.dailyRoi, // 1 period already distributed
            startDate,
            endDate,
            status: 'active',
            teamBonusPct: '0',
            source: 'deposit',
            lastRoiAt: roiDistributedAt,
            distributedPeriods: 1,
          },
        });

        investments.push({ id: investment.id, amount: inv.amount, dailyRoi: inv.dailyRoi });
        console.info(`[RESTORE] Created investment: $${inv.amount} (id: ${investment.id})`);
      }

      // ========== STEP 5: Create 4 ROI history records ==========
      console.info('[RESTORE] Step 5: Creating ROI history records...');

      const roiRecords = [
        { investmentIndex: 0, roiAmount: '0.33', totalRoi: '0.33' },  // $10 investment
        { investmentIndex: 1, roiAmount: '0.99', totalRoi: '0.99' },  // $30 investment
        { investmentIndex: 2, roiAmount: '1.32', totalRoi: '1.32' },  // $40 investment
        { investmentIndex: 3, roiAmount: '0.59', totalRoi: '0.59' },  // $18 investment (rounded from 0.594)
      ];

      for (let i = 0; i < roiRecords.length; i++) {
        const roi = roiRecords[i];
        const inv = investments[roi.investmentIndex];

        await tx.roiHistory.create({
          data: {
            userId,
            investmentId: inv.id,
            periodIndex: 1, // First 24h period
            distributedAt: roiDistributedAt,
            roiAmount: roi.roiAmount,
            roiPct: '3.3',
            teamBonus: '0',
            totalRoi: roi.totalRoi,
          },
        });
        console.info(`[RESTORE] Created ROI record: $${roi.roiAmount} for investment $${inv.amount}`);
      }

      // ========== STEP 6: Create transaction records ==========
      console.info('[RESTORE] Step 6: Creating transaction records...');

      const transactions = [
        {
          type: 'investment',
          amount: '10',
          description: 'Investimento Starter - 60 dias',
          createdAt: new Date('2026-05-28T12:56:00-03:00'),
        },
        {
          type: 'investment',
          amount: '30',
          description: 'Investimento Starter - 60 dias',
          createdAt: new Date('2026-05-28T12:56:00-03:00'),
        },
        {
          type: 'investment',
          amount: '40',
          description: 'Investimento Starter - 60 dias',
          createdAt: new Date('2026-05-28T12:57:00-03:00'),
        },
        {
          type: 'investment',
          amount: '18',
          description: 'Investimento Starter - 60 dias',
          createdAt: new Date('2026-05-28T12:57:00-03:00'),
        },
        {
          type: 'roi_profit',
          amount: '0.33',
          description: 'ROI diário Starter',
          createdAt: new Date('2026-05-28T13:43:00-03:00'),
        },
        {
          type: 'roi_profit',
          amount: '0.99',
          description: 'ROI diário Starter',
          createdAt: new Date('2026-05-28T13:43:00-03:00'),
        },
        {
          type: 'roi_profit',
          amount: '1.32',
          description: 'ROI diário Starter',
          createdAt: new Date('2026-05-28T13:43:00-03:00'),
        },
        {
          type: 'roi_profit',
          amount: '0.59',
          description: 'ROI diário Starter',
          createdAt: new Date('2026-05-28T13:43:00-03:00'),
        },
      ];

      for (const txData of transactions) {
        await tx.transaction.create({
          data: {
            userId,
            type: txData.type,
            amount: txData.amount,
            status: 'completed',
            description: txData.description,
            createdAt: txData.createdAt,
          },
        });
      }

      console.info(`[RESTORE] Created ${transactions.length} transaction records`);

      // ========== STEP 7: Log the restore action ==========
      const logAdminId = adminId || (await tx.user.findFirst({ where: { role: { in: ['admin', 'super_admin'] } } }))?.id;

      await tx.adminLog.create({
        data: {
          adminId: logAdminId,
          action: 'create',
          entity: 'user',
          entityId: userId,
          description: `Restauração de dados do usuário teste (${userEmail}) - 4 investimentos ($98) + 4 ROI ($3.23)`,
          newValue: JSON.stringify({
            userId,
            email: userEmail,
            balance: '-94.77',
            totalInvested: '98',
            totalRoi: '3.23',
            investments: 4,
            roiRecords: 4,
          }),
          ipAddress: getIpFromRequest(request),
        },
      });
    }, { timeout: 30000 });

    console.info('[RESTORE] Data restoration completed successfully!');

    return apiSuccess({
      message: 'Dados do usuário test restaurados com sucesso!',
      restored: {
        user: {
          email: userEmail,
          name: userName,
          password: userPassword,
          balance: -94.77,
          totalInvested: 98,
          totalRoi: 3.23,
        },
        investments: [
          { amount: 10, dailyRoi: 0.33, plan: 'Starter - 60 dias' },
          { amount: 30, dailyRoi: 0.99, plan: 'Starter - 60 dias' },
          { amount: 40, dailyRoi: 1.32, plan: 'Starter - 60 dias' },
          { amount: 18, dailyRoi: 0.59, plan: 'Starter - 60 dias' },
        ],
        roiHistory: [
          { amount: 0.33, date: '2026-05-28T13:43:00' },
          { amount: 0.99, date: '2026-05-28T13:43:00' },
          { amount: 1.32, date: '2026-05-28T13:43:00' },
          { amount: 0.59, date: '2026-05-28T13:43:00' },
        ],
        transactions: 8,
        adminCredentials: {
          email: 'admin@plataformaroi.com',
          password: 'Admin@2026!',
        },
      },
    }, 201);
  } catch (error) {
    console.error('[RESTORE] Error:', error);
    return handleApiError(error);
  }
}
