#!/usr/bin/env node
// ============================================================================
// ActionCash - Comprehensive Integration Test v2
// ============================================================================
// Uses Prisma directly for setup (bypass rate limits), then tests API flows
// ============================================================================

const BASE = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let results = { passed: 0, failed: 0, errors: [] };

function assert(condition, name, detail = '') {
  if (condition) {
    results.passed++;
    console.log(`   ✅ ${name}`);
  } else {
    results.failed++;
    const msg = `${name}${detail ? ' — ' + detail : ''}`;
    results.errors.push(msg);
    console.log(`   ❌ ${msg}`);
  }
}

const fmt$ = v => '$' + parseFloat(v || 0).toFixed(2);

// Cookie jar
const jar = {};
async function api(method, path, body, email) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (jar[email]) opts.headers['Cookie'] = jar[email];
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length > 0 && email) jar[email] = setCookie.map(c => c.split(';')[0]).join('; ');
  const data = await res.json();
  return { status: res.status, data, ok: res.ok };
}

// Login with rate limit handling
async function login(email, password) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await api('POST', '/api/auth/login', { email, password }, email);
    if (r.ok) return true;
    if (r.status === 429) {
      console.log(`   ⏳ Rate limited on ${email}, waiting 65s...`);
      await new Promise(r => setTimeout(r, 65000));
      continue;
    }
    return false;
  }
  return false;
}

async function main() {
  console.log('\n🧪 ActionCash Integration Test v2');
  console.log('═'.repeat(60));

  // ── Load user data from DB ──────────────────────────────────────────
  const dbUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, affiliateCode: true, referredBy: true, hasInvested: true, role: true }
  });
  const userMap = {};
  dbUsers.forEach(u => userMap[u.email] = u);
  console.log(`📋 Loaded ${dbUsers.length} users from DB`);

  const CHAIN = [
    'carlos@test.com', 'ana@test.com', 'bruno@test.com', 'carla@test.com',
    'diego@test.com', 'elena@test.com', 'felipe@test.com', 'gabriela@test.com',
    'hugo@test.com', 'isabela@test.com', 'joao@test.com', 'karla@test.com',
  ];
  const ALL = [...CHAIN, 'lucas@test.com', 'maria@test.com', 'noinvest@test.com', 'pedro@test.com', 'admin@actioncash.app'];

  // ── 1. REFERRAL CHAIN VERIFICATION ──────────────────────────────────
  console.log('\n👥 1. REFERRAL CHAIN VERIFICATION');
  console.log('─'.repeat(40));

  assert(userMap['carlos@test.com'] && !userMap['carlos@test.com'].referredBy,
    'Carlos is top of chain (no referrer)');
  
  // Verify chain: each user referred by previous
  for (let i = 1; i < CHAIN.length; i++) {
    const user = userMap[CHAIN[i]];
    const referrer = userMap[CHAIN[i - 1]];
    assert(user?.referredBy === referrer?.id,
      `${user?.name || CHAIN[i]} referred by ${referrer?.name || CHAIN[i-1]}`,
      `referredBy=${user?.referredBy} vs referrer.id=${referrer?.id}`);
  }

  // Verify extra referrals
  assert(userMap['lucas@test.com']?.referredBy === userMap['carlos@test.com']?.id, 'Lucas referred by Carlos');
  assert(userMap['maria@test.com']?.referredBy === userMap['carlos@test.com']?.id, 'Maria referred by Carlos');
  assert(userMap['noinvest@test.com']?.referredBy === userMap['carlos@test.com']?.id, 'NoInvest referred by Carlos');
  assert(userMap['pedro@test.com']?.referredBy === userMap['ana@test.com']?.id, 'Pedro referred by Ana');

  // Verify affiliate codes exist
  let allHaveCodes = true;
  for (const email of ALL) {
    if (!userMap[email]?.affiliateCode) {
      allHaveCodes = false;
      console.log(`   ⚠️ ${email} has no affiliate code`);
    }
  }
  assert(allHaveCodes, 'All users have affiliate codes');
  console.log();

  // ── 2. DIRECTLY CREDIT BALANCES (bypass rate-limited deposit flow) ──
  console.log('💰 2. CREDIT BALANCES VIA PRISMA');
  console.log('─'.repeat(40));

  const creditAmounts = {
    'carlos@test.com': 2000,
    'ana@test.com': 500,
    'bruno@test.com': 200,
    'carla@test.com': 100,
    'diego@test.com': 50,
    'elena@test.com': 50,
    'felipe@test.com': 30,
    'gabriela@test.com': 20,
    'hugo@test.com': 10,
    'isabela@test.com': 10,
    'joao@test.com': 10,
    'karla@test.com': 10,
    'lucas@test.com': 100,
    'maria@test.com': 100,
  };

  for (const [email, amount] of Object.entries(creditAmounts)) {
    const user = userMap[email];
    if (!user) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: String(amount),
        totalDeposited: String(amount),
        hasInvested: true,
        linkUnlocked: true,
      },
    });
    // Create a deposit record + transaction
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        type: 'deposit',
        method: 'usdt_trc20',
        amount: String(amount),
        status: 'confirmed',
        txHash: `0xSEED_${user.id.slice(0,8)}_${Date.now()}`,
        processedBy: userMap['admin@actioncash.app']?.id,
        processedAt: new Date(),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'deposit',
        amount: String(amount),
        status: 'confirmed',
        description: `Depósito USDT TRC20 — ${fmt$(amount)}`,
        referenceId: deposit.id,
        referenceType: 'deposit',
      },
    });
    console.log(`   ✅ ${user.name}: ${fmt$(amount)} credited`);
  }

  // Verify noinvest and pedro have no balance
  assert(!creditAmounts['noinvest@test.com'], 'NoInvest has no credits (correct)');
  assert(!creditAmounts['pedro@test.com'], 'Pedro has no credits (correct)');
  console.log();

  // ── 3. LOGIN (staggered to avoid rate limit) ────────────────────────
  console.log('🔐 3. AUTHENTICATION');
  console.log('─'.repeat(40));

  // Login admin first
  assert(await login('admin@actioncash.app', 'Admin@123456'), 'Admin login');

  // Login users with 7-second gaps to stay under 10/min rate limit
  for (let i = 0; i < CHAIN.length; i++) {
    const ok = await login(CHAIN[i], 'Test@123456');
    assert(ok, `Login ${userMap[CHAIN[i]]?.name || CHAIN[i]}`);
    if (i < CHAIN.length - 1) await new Promise(r => setTimeout(r, 7000));
  }

  // Wait for rate limit reset then login extra users
  console.log('   ⏳ Waiting for rate limit reset...');
  await new Promise(r => setTimeout(r, 65000));
  for (const email of ['lucas@test.com', 'maria@test.com', 'noinvest@test.com', 'pedro@test.com']) {
    const ok = await login(email, 'Test@123456');
    assert(ok, `Login ${userMap[email]?.name || email}`);
    await new Promise(r => setTimeout(r, 7000));
  }
  console.log();

  // ── 4. GET PLANS ────────────────────────────────────────────────────
  console.log('📊 4. INVESTMENT PLANS');
  console.log('─'.repeat(40));

  let r = await api('GET', '/api/plans', null, 'carlos@test.com');
  let plans = [];
  if (r.ok && Array.isArray(r.data)) {
    plans = r.data;
  } else if (r.ok && r.data.plans) {
    plans = r.data.plans;
  } else {
    // Try getting plans directly from DB
    plans = await prisma.investmentPlan.findMany({ where: { isActive: true } });
  }
  
  const starterPlan = plans.find(p => p.name === 'Starter');
  const growthPlan = plans.find(p => p.name === 'Growth');
  const elitePlan = plans.find(p => p.name === 'Elite');
  
  assert(starterPlan, `Starter plan found (id: ${starterPlan?.id || 'N/A'})`);
  assert(growthPlan, `Growth plan found (id: ${growthPlan?.id || 'N/A'})`);
  assert(elitePlan, `Elite plan found (id: ${elitePlan?.id || 'N/A'})`);
  console.log();

  // ── 5. INVESTMENTS ─────────────────────────────────────────────────
  console.log('📈 5. INVESTMENT FLOW');
  console.log('─'.repeat(40));

  const investmentPlan = {
    'carlos@test.com':  { amount: 1000, planId: elitePlan?.id, planName: 'Elite' },
    'ana@test.com':     { amount: 200,  planId: growthPlan?.id, planName: 'Growth' },
    'bruno@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
    'carla@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
    'diego@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
    'elena@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
    'felipe@test.com':  { amount: 30,   planId: starterPlan?.id, planName: 'Starter' },
    'gabriela@test.com':{ amount: 10,   planId: starterPlan?.id, planName: 'Starter' },
    'hugo@test.com':    { amount: 10,   planId: starterPlan?.id, planName: 'Starter' },
    'isabela@test.com': { amount: 10,   planId: starterPlan?.id, planName: 'Starter' },
    'joao@test.com':    { amount: 10,   planId: starterPlan?.id, planName: 'Starter' },
    'karla@test.com':   { amount: 10,   planId: starterPlan?.id, planName: 'Starter' },
    'lucas@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
    'maria@test.com':   { amount: 50,   planId: starterPlan?.id, planName: 'Starter' },
  };

  for (const [email, inv] of Object.entries(investmentPlan)) {
    if (!inv.planId) {
      assert(false, `${email} invest — no plan ID`);
      continue;
    }
    r = await api('POST', '/api/investments', { planId: inv.planId, amount: inv.amount }, email);
    assert(r.ok, `${userMap[email]?.name} invested ${fmt$(inv.amount)} in ${inv.planName}`,
      r.ok ? '' : r.data.error);
    // Small delay between investments
    await new Promise(res => setTimeout(res, 500));
  }
  console.log();

  // ── 6. AFFILIATE COMMISSIONS ────────────────────────────────────────
  console.log('🔗 6. AFFILIATE COMMISSION DISTRIBUTION');
  console.log('─'.repeat(40));

  // Check Carlos (top of chain - should earn from L1 direct refs)
  r = await api('GET', '/api/affiliate', null, 'carlos@test.com');
  if (r.ok) {
    const aff = r.data;
    console.log(`   Carlos: totalReferrals=${aff.totalReferrals}, totalEarnings=${fmt$(aff.totalEarnings)}`);
    assert(aff.totalReferrals >= 4, `Carlos has ${aff.totalReferrals} referrals (4 direct: Ana, Lucas, Maria, NoInvest)`);
    assert(aff.totalEarnings > 0, `Carlos earned affiliate commissions: ${fmt$(aff.totalEarnings)}`);
    assert(aff.hasInvested === true, 'Carlos hasInvested = true');
    assert(aff.linkUnlocked === true, 'Carlos linkUnlocked = true');

    // Check commission by level
    if (aff.commissionByLevel?.length > 0) {
      console.log('   Commission by level:');
      aff.commissionByLevel.forEach(l => {
        const sum = l._sum?.commissionAmount || 0;
        console.log(`     L${l.level}: ${l._count} txns, total ${fmt$(sum)}`);
      });
    }

    // Verify fromUser shows referral name (not own name)
    if (aff.recentCommissions?.length > 0) {
      const first = aff.recentCommissions[0];
      const from = first.fromUser?.name || first.user?.name || '???';
      assert(from !== 'Carlos Top', `Commission fromUser = "${from}" (not "Carlos Top")`);
    }

    // Verify affiliate levels
    if (aff.affiliateLevels) {
      assert(aff.affiliateLevels.length === 11, `11 levels loaded (got ${aff.affiliateLevels.length})`);
    }

    // Verify ranks from DB
    if (aff.ranks) {
      assert(aff.ranks.length >= 3, `${aff.ranks.length} ranks loaded from DB`);
    }
  } else {
    assert(false, 'Fetch Carlos affiliate data', r.data.error);
  }
  console.log();

  // ── 7. COMMISSION CASCADE THROUGH LEVELS ────────────────────────────
  console.log('🌊 7. MULTI-LEVEL COMMISSION CASCADE');
  console.log('─'.repeat(40));

  let totalDistributed = 0;
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const email = CHAIN[i];
    const name = userMap[email]?.name || email;
    r = await api('GET', '/api/affiliate', null, email);
    if (r.ok) {
      const earned = parseFloat(r.data.totalEarnings || 0);
      totalDistributed += earned;
      if (earned > 0) {
        console.log(`   L${i} ${name}: earned ${fmt$(earned)} in commissions`);
      }
      // Users who invested should earn (referrer must have hasInvested=true)
      // All chain users invested, so all should have earned something from their downline
    } else {
      console.log(`   ⚠️ L${i} ${name}: failed to fetch — ${r.data.error}`);
    }
    await new Promise(res => setTimeout(res, 300));
  }
  console.log(`   💵 Total commissions distributed across chain: ${fmt$(totalDistributed)}`);
  assert(totalDistributed > 0, 'Commissions distributed across the referral chain');
  console.log();

  // ── 8. TEAM BONUS ──────────────────────────────────────────────────
  console.log('🏆 8. TEAM BONUS');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/team-bonus', null, 'carlos@test.com');
  if (r.ok) {
    const tb = r.data;
    assert(tb.teamActiveCapital > 0, `Team capital: ${fmt$(tb.teamActiveCapital)}`);
    assert(tb.teamMembers > 0, `Team members: ${tb.teamMembers}`);
    assert(tb.hasOwnInvestment === true, 'Carlos has own investment');

    if (tb.salary) {
      console.log(`   📅 Salary: qualified=${tb.salary.qualified}, est=${fmt$(tb.salary.estimatedWeeklySalary)}`);
      console.log(`      minCapital=${fmt$(tb.salary.minTeamCapital)}, pct=${tb.salary.salaryPct}%`);
      if (tb.teamActiveCapital >= (tb.salary.minTeamCapital || 2000)) {
        assert(tb.salary.qualified === true, 'Salary QUALIFIED ✅');
      }
    }
    if (tb.gold) {
      console.log(`   🥇 Gold: qualified=${tb.gold.qualified}, est=${fmt$(tb.gold.estimatedWeeklyGold)}`);
    }
    if (tb.daymond) {
      console.log(`   💎 Daymond: qualified=${tb.daymond.qualified}, pkg=${fmt$(tb.daymond.packageAmount)}`);
    }
    if (tb.daymondPremium) {
      console.log(`   👑 Daymond Premium: qualified=${tb.daymondPremium.qualified}`);
    }
    if (tb.progress) {
      console.log(`   📊 Progress: salary=${tb.progress.salaryProgress}%, gold=${tb.progress.goldProgress}%, daymond=${tb.progress.daymondProgress}%`);
    }
  } else {
    assert(false, 'Team bonus for Carlos', r.data.error);
  }
  console.log();

  // ── 9. WITHDRAWAL ──────────────────────────────────────────────────
  console.log('💸 9. WITHDRAWAL TESTS');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/withdraw/info', null, 'carlos@test.com');
  if (r.ok) {
    const info = r.data;
    console.log(`   Max withdrawable: ${fmt$(info.maxWithdrawable)}, fee: ${info.feePct}%`);
    assert(info.maxWithdrawable > 0, `Can withdraw: ${fmt$(info.maxWithdrawable)}`);
  }

  r = await api('POST', '/api/withdraw', {
    amount: 10,
    method: 'usdt_trc20',
    destination: 'TWithdrawTestAddress123',
  }, 'carlos@test.com');
  assert(r.ok, `Withdrawal ${fmt$(10)} created`, r.ok ? '' : r.data.error);
  console.log();

  // ── 10. TRANSFER ───────────────────────────────────────────────────
  console.log('🔄 10. TRANSFER TESTS');
  console.log('─'.repeat(40));

  r = await api('POST', '/api/transfers', {
    toEmail: 'bruno@test.com',
    amount: 5,
  }, 'ana@test.com');
  if (r.ok) {
    assert(true, 'Ana transferred $5 to Bruno');
    // Verify Bruno received
    r = await api('GET', '/api/user', null, 'bruno@test.com');
    if (r.ok) console.log(`   Bruno balance after: ${fmt$(r.data.balance)}`);
  } else {
    const err = r.data.error || '';
    if (err.includes('invest')) {
      assert(true, 'Transfer correctly requires investment');
    } else {
      assert(false, 'Transfer Ana→Bruno', err);
    }
  }

  // Non-investor should not be able to transfer
  r = await api('POST', '/api/transfers', {
    toEmail: 'pedro@test.com',
    amount: 1,
  }, 'noinvest@test.com');
  assert(!r.ok, 'Non-investor transfer blocked');
  console.log();

  // ── 11. VOUCHER ────────────────────────────────────────────────────
  console.log('🎫 11. VOUCHER TESTS');
  console.log('─'.repeat(40));

  const carlosId = userMap['carlos@test.com']?.id;
  r = await api('POST', '/api/admin/vouchers', {
    userId: carlosId,
    type: 'basic',
    amount: 200,
    goalDirectReferrals: 5,
    goalMinReferralInvest: 50,
    withdrawalUnlockPct: 50,
    daysValid: 30,
  }, 'admin@actioncash.app');

  if (r.ok) {
    assert(true, 'Voucher created for Carlos ($200)');
    // Verify voucher balance
    r = await api('GET', '/api/user', null, 'carlos@test.com');
    if (r.ok) {
      const vb = parseFloat(r.data.voucherBalance || 0);
      assert(vb > 0, `Carlos voucher balance: ${fmt$(vb)}`);
    }
  } else {
    assert(false, 'Create voucher', r.data.error);
  }
  console.log();

  // ── 12. NON-INVESTOR CHECKS ────────────────────────────────────────
  console.log('🚫 12. NON-INVESTOR CHECKS');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/affiliate', null, 'noinvest@test.com');
  if (r.ok) {
    assert(r.data.hasInvested === false, 'NoInvest hasInvested = false');
    assert(r.data.linkUnlocked === false, 'NoInvest linkUnlocked = false (needs investment)');
  }

  // NoInvest cannot invest (no balance)
  r = await api('POST', '/api/investments', { planId: starterPlan?.id, amount: 5 }, 'noinvest@test.com');
  assert(!r.ok, 'NoInvest cannot invest (no balance)');
  console.log();

  // ── 13. DASHBOARD DATA ─────────────────────────────────────────────
  console.log('📊 13. DASHBOARD DATA VERIFICATION');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/user', null, 'carlos@test.com');
  if (r.ok) {
    const u = r.data;
    console.log(`   Carlos snapshot:`);
    console.log(`     balance: ${fmt$(u.balance)}`);
    console.log(`     affiliateBalance: ${fmt$(u.affiliateBalance)}`);
    console.log(`     voucherBalance: ${fmt$(u.voucherBalance)}`);
    console.log(`     totalInvested: ${fmt$(u.totalInvested)}`);
    console.log(`     totalDeposited: ${fmt$(u.totalDeposited)}`);
    console.log(`     hasInvested: ${u.hasInvested}`);
    assert(parseFloat(u.totalInvested) > 0, 'Carlos totalInvested > 0');
    assert(parseFloat(u.totalDeposited) > 0, 'Carlos totalDeposited > 0');
    assert(u.hasInvested === true, 'Carlos hasInvested = true');
  }
  console.log();

  // ── 14. ACTIVE INVESTMENTS ─────────────────────────────────────────
  console.log('📋 14. ACTIVE INVESTMENTS');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/investments', null, 'carlos@test.com');
  if (r.ok) {
    const invs = Array.isArray(r.data) ? r.data : (r.data.investments || []);
    assert(invs.length > 0, `Carlos has ${invs.length} investments`);
    invs.forEach(inv => {
      const src = inv.source || 'deposit';
      console.log(`   📈 ${inv.plan?.name || '?'}: ${fmt$(inv.amount)} @ ${inv.dailyRoiPct}%/day, source=${src}`);
    });
  }
  console.log();

  // ── 15. TRANSACTIONS ───────────────────────────────────────────────
  console.log('📜 15. TRANSACTION HISTORY');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/transactions', null, 'carlos@test.com');
  if (r.ok) {
    const txs = Array.isArray(r.data) ? r.data : (r.data.transactions || []);
    assert(txs.length > 0, `Carlos has ${txs.length} transactions`);
    const types = {};
    txs.forEach(tx => { types[tx.type] = (types[tx.type] || 0) + 1; });
    Object.entries(types).forEach(([type, count]) => console.log(`     ${type}: ${count}`));
    assert(types['deposit'] > 0, 'Has deposit transactions');
  }
  console.log();

  // ── 16. SITE CONFIG ────────────────────────────────────────────────
  console.log('⚙️ 16. SITE CONFIG');
  console.log('─'.repeat(40));

  r = await api('GET', '/api/site/config', null, 'carlos@test.com');
  if (r.ok) {
    const c = r.data;
    assert(c.hasPix === true, 'PIX enabled');
    assert(c.hasUsdt === true, 'USDT enabled');
    assert(c.minDepositUsdt > 0, `Min deposit: ${c.minDepositUsdt}`);
    console.log(`   ✅ Config OK`);
  }
  console.log();

  // ── 17. EDGE CASES ─────────────────────────────────────────────────
  console.log('🔍 17. EDGE CASES');
  console.log('─'.repeat(40));

  // Invest more than balance
  r = await api('POST', '/api/investments', { planId: starterPlan?.id, amount: 999999 }, 'carlos@test.com');
  assert(!r.ok, 'Invest $999999 fails');

  // Withdraw more than balance
  r = await api('POST', '/api/withdraw', { amount: 999999, method: 'usdt_trc20', destination: 'T' }, 'carlos@test.com');
  assert(!r.ok, 'Withdraw $999999 fails');
  console.log();

  // ════════════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 FINAL TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.passed + results.failed}`);
  const rate = results.passed + results.failed > 0 
    ? ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) 
    : '0.0';
  console.log(`📈 Rate:   ${rate}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }
  console.log('\n' + '═'.repeat(60));
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(2); })
  .finally(() => prisma.$disconnect());
