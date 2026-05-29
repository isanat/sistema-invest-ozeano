#!/usr/bin/env node
const BASE = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let R = { pass: 0, fail: 0, err: [] };
const ok = (c,n,d='') => { if(c){R.pass++;console.log(`✅ ${n}`)}else{R.fail++;R.err.push(n+(d?' — '+d:''));console.log(`❌ ${n}${d?' — '+d:''}`)} };
const $ = v => '$'+parseFloat(v||0).toFixed(2);

// Login and get cookie
async function getSession(email) {
  const pwd = email.includes('admin') ? 'Admin@123456' : 'Test@123456';
  const res = await fetch(`${BASE}/api/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email, password: pwd})
  });
  if (res.status === 429) { 
    console.log(`   ⏳ Rate limited on ${email}, waiting...`);
    await new Promise(r => setTimeout(r, 70000));
    return getSession(email); // retry
  }
  const data = await res.json();
  const cookies = res.headers.getSetCookie()?.map(c=>c.split(';')[0]).join('; ')||'';
  return { cookies, userId: data.user?.id };
}

async function api(path, email) {
  const { cookies } = await getSession(email);
  const res = await fetch(`${BASE}${path}`, { headers: { 'Cookie': cookies } });
  if (res.status === 429) return { ok: false, data: { error: 'Rate limited' }, status: 429 };
  const data = await res.json();
  return { ok: res.ok, data, status: res.status };
}

async function main() {
  console.log('\n🧪 ActionCash Full Integration Test\n');
  
  const users = await prisma.user.findMany({select:{id:true,email:true,name:true,affiliateCode:true,referredBy:true,hasInvested:true}});
  const u = {}; users.forEach(x => u[x.email] = x);

  // 1. REFERRAL CHAIN
  console.log('👥 1. REFERRAL CHAIN');
  const chain = ['carlos@test.com','ana@test.com','bruno@test.com','carla@test.com','diego@test.com','elena@test.com','felipe@test.com','gabriela@test.com','hugo@test.com','isabela@test.com','joao@test.com','karla@test.com'];
  ok(!u['carlos@test.com'].referredBy, 'Carlos is top of chain');
  for(let i=1;i<chain.length;i++) ok(u[chain[i]].referredBy===u[chain[i-1]].id, `L${i} ${u[chain[i]].name} → ${u[chain[i-1]].name}`);
  ok(u['lucas@test.com'].referredBy===u['carlos@test.com'].id, 'Lucas → Carlos');
  ok(u['noinvest@test.com'].referredBy===u['carlos@test.com'].id, 'NoInvest → Carlos');
  ok(u['pedro@test.com'].referredBy===u['ana@test.com'].id, 'Pedro → Ana');
  
  // All users have affiliate codes
  ok(users.every(x=>x.affiliateCode), 'All users have affiliate codes');

  // 2. CARLOS DASHBOARD DATA
  console.log('\n📊 2. CARLOS DASHBOARD DATA');
  let r = await api('/api/user', 'carlos@test.com');
  if (r.ok && r.data.user) {
    const d = r.data.user;
    console.log(`   balance=${$(d.balance)} affiliate=${$(d.affiliateBalance)} invested=${$(d.totalInvested)} deposited=${$(d.totalDeposited)}`);
    ok(parseFloat(d.totalInvested) > 0, `Carlos totalInvested = ${$(d.totalInvested)}`);
    ok(parseFloat(d.totalDeposited) > 0, `Carlos totalDeposited = ${$(d.totalDeposited)}`);
    ok(d.hasInvested === true, 'Carlos hasInvested = true');
    ok(d.affiliateCode, `Carlos affiliateCode = ${d.affiliateCode}`);
  } else { ok(false, 'Fetch Carlos data', JSON.stringify(r.data).slice(0,200)); }

  // 3. AFFILIATE DATA
  console.log('\n🔗 3. AFFILIATE COMMISSION DATA');
  r = await api('/api/affiliate', 'carlos@test.com');
  if (r.ok) {
    const a = r.data.affiliate || r.data;
    ok(a.totalReferrals >= 4, `Carlos totalReferrals = ${a.totalReferrals}`);
    ok(a.totalEarnings > 0, `Carlos totalEarnings = ${$(a.totalEarnings)}`);
    ok(a.hasInvested === true, 'Carlos hasInvested = true');
    ok(a.linkUnlocked === true, 'Carlos linkUnlocked = true');
    
    // Check levels
    const levels = r.data.affiliateLevels || a.affiliateLevels;
    ok(levels?.length === 11, `11 affiliate levels (got ${levels?.length})`);
    
    // Check ranks from DB
    const ranks = r.data.ranks || a.ranks;
    ok(ranks?.length >= 3, `${ranks?.length} ranks from DB`);
    
    // Check commission by level
    if (a.commissionByLevel?.length > 0) {
      console.log('   Commission by level:');
      a.commissionByLevel.forEach(l => console.log(`     L${l.level}: ${l._count} txns, total ${$(l._sum?.commissionAmount||0)}`));
    }
    
    // Check recent commissions - verify fromUser shows referral name
    if (a.recentCommissions?.length > 0) {
      const first = a.recentCommissions[0];
      const fromName = first.fromUser?.name || first.user?.name || 'unknown';
      ok(fromName !== 'Carlos Top', `fromUser = "${fromName}" (not own name)`);
      console.log(`   Latest commission: from=${fromName}, amount=${$(first.commissionAmount)}, level=${first.level}`);
    }
    
    // Check current rank
    const currentRank = r.data.currentRank;
    if (currentRank) console.log(`   Current rank: ${currentRank.icon} ${currentRank.name}`);
    
    // Check next rank
    const nextRank = r.data.nextRank;
    if (nextRank) console.log(`   Next rank: ${nextRank.icon} ${nextRank.name} (need ${nextRank.minReferrals} refs, ${$(nextRank.minEarnings)} earnings)`);
  } else { ok(false, 'Affiliate data', JSON.stringify(r.data).slice(0,200)); }

  // 4. MULTI-LEVEL CASCADE
  console.log('\n🌊 4. COMMISSION CASCADE VERIFICATION');
  let totalCommissions = 0;
  for (let i = 0; i < Math.min(chain.length - 1, 6); i++) { // Check first 6 levels (rate limit friendly)
    const email = chain[i];
    r = await api('/api/affiliate', email);
    if (r.ok) {
      const a = r.data.affiliate || r.data;
      const earned = parseFloat(a.totalEarnings || 0);
      totalCommissions += earned;
      if (earned > 0) console.log(`   L${i} ${u[email]?.name}: earned ${$(earned)}`);
      ok(earned > 0, `L${i} ${u[email]?.name} earned commissions: ${$(earned)}`);
    } else {
      console.log(`   ⚠️ L${i} ${email}: ${r.status}`);
    }
  }
  console.log(`   💵 Total commissions in chain: ${$(totalCommissions)}`);

  // 5. TEAM BONUS
  console.log('\n🏆 5. TEAM BONUS');
  r = await api('/api/team-bonus', 'carlos@test.com');
  if (r.ok) {
    const t = r.data;
    ok(t.teamActiveCapital > 0, `Team capital: ${$(t.teamActiveCapital)}`);
    ok(t.teamMembers > 0, `Team members: ${t.teamMembers}`);
    ok(t.hasOwnInvestment === true, 'Has own investment');
    
    if (t.salary) {
      console.log(`   📅 Salary: qualified=${t.salary.qualified}, est=${$(t.salary.estimatedWeeklySalary)}, min=${$(t.salary.minTeamCapital)}, pct=${t.salary.salaryPct}%`);
      // Team capital is ~$1560 which is less than $2000 min
      if (t.teamActiveCapital >= (t.salary.minTeamCapital || 2000)) {
        ok(t.salary.qualified === true, 'Salary QUALIFIED');
      } else {
        ok(t.salary.qualified === false, 'Salary not yet qualified (capital < min)');
      }
    }
    if (t.gold) console.log(`   🥇 Gold: qualified=${t.gold.qualified}, est=${$(t.gold.estimatedWeeklyGold)}, min=${$(t.gold.minTeamCapital)}`);
    if (t.daymond) console.log(`   💎 Daymond: qualified=${t.daymond.qualified}, pkg=${$(t.daymond.packageAmount)}`);
    if (t.daymondPremium) console.log(`   👑 Premium: qualified=${t.daymondPremium.qualified}`);
    if (t.progress) console.log(`   📊 Progress: salary=${t.progress.salaryProgress}%, gold=${t.progress.goldProgress}%, daymond=${t.progress.daymondProgress}%`);
  } else { ok(false, 'Team bonus', JSON.stringify(r.data).slice(0,200)); }

  // 6. WITHDRAWAL
  console.log('\n💸 6. WITHDRAWAL');
  // Give Carlos balance
  await prisma.user.update({where:{id:u['carlos@test.com'].id},data:{balance:'500'}});
  r = await api('/api/withdraw/info', 'carlos@test.com');
  if (r.ok) {
    console.log(`   Max withdrawable: ${$(r.data.maxWithdrawable)}, fee: ${r.data.feePct}%`);
    ok(r.data.maxWithdrawable > 0, 'Can withdraw');
  }

  // 7. NON-INVESTOR CHECKS
  console.log('\n🚫 7. NON-INVESTOR CHECKS');
  r = await api('/api/affiliate', 'noinvest@test.com');
  if (r.ok) {
    const a = r.data.affiliate || r.data;
    ok(a.hasInvested === false, 'NoInvest hasInvested=false');
    ok(a.linkUnlocked === false, 'NoInvest linkUnlocked=false (needs investment first)');
  }

  // 8. INVESTMENTS LIST
  console.log('\n📋 8. ACTIVE INVESTMENTS');
  r = await api('/api/investments', 'carlos@test.com');
  if (r.ok) {
    const invs = Array.isArray(r.data) ? r.data : (r.data.investments || []);
    ok(invs.length > 0, `Carlos has ${invs.length} investments`);
    invs.forEach(i => console.log(`   📈 ${i.plan?.name||'?'}: ${$(i.amount)} @ ${i.dailyRoiPct}%/day, source=${i.source||'deposit'}`));
    // Check source field exists
    if (invs.length > 0) ok(invs[0].source !== undefined, `Investment source field present: "${invs[0].source}"`);
  }

  // 9. TRANSACTIONS
  console.log('\n📜 9. TRANSACTIONS');
  r = await api('/api/transactions', 'carlos@test.com');
  if (r.ok) {
    const txs = Array.isArray(r.data) ? r.data : (r.data.transactions || []);
    ok(txs.length > 0, `${txs.length} transactions`);
    const types = {}; txs.forEach(t => { types[t.type] = (types[t.type] || 0) + 1; });
    Object.entries(types).forEach(([t,c]) => console.log(`   ${t}: ${c}`));
    ok(types['deposit'] > 0, 'Has deposit transactions');
    ok(types['investment'] > 0, 'Has investment transactions');
    // Check for affiliate_commission transactions
    if (types['affiliate_commission'] > 0) ok(true, 'Has affiliate commission transactions');
  }

  // 10. SITE CONFIG
  console.log('\n⚙️ 10. SITE CONFIG');
  r = await api('/api/site/config', 'carlos@test.com');
  if (r.ok) {
    const c = r.data;
    ok(c.hasPix === true, 'PIX enabled');
    ok(c.hasUsdt === true, 'USDT enabled');
    ok(c.minDepositUsdt > 0, `Min deposit: ${c.minDepositUsdt}`);
    ok(c.manualDepositEnabled === true, 'Manual deposit enabled');
  }

  // 11. PLANS API
  console.log('\n📊 11. PLANS API');
  r = await api('/api/plans', 'carlos@test.com');
  if (r.ok) {
    const plans = Array.isArray(r.data) ? r.data : (r.data.plans || []);
    ok(plans.length >= 3, `${plans.length} plans available`);
    plans.forEach(p => console.log(`   ${p.name}: $${p.minAmount}-$${p.maxAmount} @ ${p.dailyRoiPct}%/${p.durationDays}d`));
  }

  // SUMMARY
  console.log('\n' + '═'.repeat(50));
  console.log('🧪 FINAL TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${R.pass}`);
  console.log(`❌ Failed: ${R.fail}`);
  const total = R.pass + R.fail;
  console.log(`📊 Total:  ${total}`);
  console.log(`📈 Rate:   ${total > 0 ? ((R.pass/total)*100).toFixed(1) : 0}%`);
  if (R.err.length) {
    console.log('\n❌ Failures:');
    R.err.forEach((e,i) => console.log(`   ${i+1}. ${e}`));
  }
  console.log('═'.repeat(50));
}

main().catch(e => console.error('Fatal:', e)).finally(() => prisma.$disconnect());
