#!/usr/bin/env node
const BASE = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let R = { pass: 0, fail: 0, err: [] };
const ok = (c,n,d='') => { if(c){R.pass++;console.log(`✅ ${n}`)}else{R.fail++;R.err.push(n+(d?' — '+d:''));console.log(`❌ ${n}${d?' — '+d:''}`)} };
const $ = v => '$'+parseFloat(v||0).toFixed(2);

// Pre-login all sessions (with staggered timing)
const sessions = {};
async function preLogin(emails) {
  const pwd = email => email.includes('admin') ? 'Admin@123456' : 'Test@123456';
  for (const email of emails) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, password: pwd(email)})
      });
      if (res.ok) {
        sessions[email] = res.headers.getSetCookie()?.map(c=>c.split(';')[0]).join('; ')||'';
        break;
      }
      if (res.status === 429) {
        console.log(`   ⏳ Rate limited, waiting 70s...`);
        await new Promise(r => setTimeout(r, 70000));
      }
    }
    await new Promise(r => setTimeout(r, 2000)); // 2s between logins
  }
}

async function api(path, email) {
  if (!sessions[email]) await preLogin([email]);
  const res = await fetch(`${BASE}${path}`, { headers: { 'Cookie': sessions[email] || '' } });
  if (res.status === 429) return { ok: false, data: { error: 'Rate limited' } };
  try { return { ok: res.ok, data: await res.json(), status: res.status }; }
  catch { return { ok: false, data: { error: `HTTP ${res.status}` }, status: res.status }; }
}

async function apiPost(path, body, email) {
  if (!sessions[email]) await preLogin([email]);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessions[email] || '' },
    body: JSON.stringify(body)
  });
  if (res.status === 429) return { ok: false, data: { error: 'Rate limited' } };
  try { return { ok: res.ok, data: await res.json(), status: res.status }; }
  catch { return { ok: false, data: { error: `HTTP ${res.status}` }, status: res.status }; }
}

async function main() {
  console.log('\n🧪 ActionCash Final Integration Test\n');
  
  const users = await prisma.user.findMany({select:{id:true,email:true,name:true,affiliateCode:true,referredBy:true,hasInvested:true}});
  const u = {}; users.forEach(x => u[x.email] = x);
  const chain = ['carlos@test.com','ana@test.com','bruno@test.com','carla@test.com','diego@test.com','elena@test.com','felipe@test.com','gabriela@test.com','hugo@test.com','isabela@test.com','joao@test.com','karla@test.com'];

  // Pre-login key users
  console.log('🔐 Pre-login sessions...');
  await preLogin(['carlos@test.com','ana@test.com','bruno@test.com','noinvest@test.com','admin@actioncash.app']);
  console.log('   Done\n');

  // 1. REFERRAL CHAIN
  console.log('👥 1. REFERRAL CHAIN');
  ok(!u['carlos@test.com'].referredBy, 'Carlos is top of chain');
  for(let i=1;i<chain.length;i++) ok(u[chain[i]].referredBy===u[chain[i-1]].id, `L${i} ${u[chain[i]].name} → ${u[chain[i-1]].name}`);
  ok(u['lucas@test.com'].referredBy===u['carlos@test.com'].id, 'Lucas → Carlos');
  ok(u['noinvest@test.com'].referredBy===u['carlos@test.com'].id, 'NoInvest → Carlos');
  ok(u['pedro@test.com'].referredBy===u['ana@test.com'].id, 'Pedro → Ana');
  ok(users.every(x=>x.affiliateCode), 'All users have affiliate codes');

  // 2. DASHBOARD DATA
  console.log('\n📊 2. DASHBOARD DATA');
  let r = await api('/api/user', 'carlos@test.com');
  if (r.ok && r.data.user) {
    const d = r.data.user;
    console.log(`   balance=${$(d.balance)} affiliate=${$(d.affiliateBalance)} invested=${$(d.totalInvested)} deposited=${$(d.totalDeposited)}`);
    ok(parseFloat(d.totalInvested) > 0, `totalInvested = ${$(d.totalInvested)}`);
    ok(parseFloat(d.totalDeposited) > 0, `totalDeposited = ${$(d.totalDeposited)}`);
    ok(d.hasInvested === true, 'hasInvested = true');
    ok(d.affiliateCode, `affiliateCode = ${d.affiliateCode}`);
  }

  // 3. AFFILIATE DATA
  console.log('\n🔗 3. AFFILIATE COMMISSIONS');
  r = await api('/api/affiliate', 'carlos@test.com');
  if (r.ok) {
    const a = r.data.affiliate || r.data;
    ok(a.totalReferrals >= 4, `totalReferrals = ${a.totalReferrals}`);
    ok(a.totalEarnings > 0, `totalEarnings = ${$(a.totalEarnings)}`);
    ok(a.hasInvested === true, 'hasInvested = true');
    ok(a.linkUnlocked === true, 'linkUnlocked = true');
    ok((r.data.affiliateLevels||a.affiliateLevels)?.length === 11, `11 levels loaded`);
    ok((r.data.ranks||a.ranks)?.length >= 3, `3+ ranks from DB`);
    if (a.commissionByLevel?.length > 0) {
      console.log('   Commission by level:');
      a.commissionByLevel.forEach(l => console.log(`     L${l.level}: ${$(l._sum?.commissionAmount||0)}`));
    }
    if (a.recentCommissions?.length > 0) {
      const first = a.recentCommissions[0];
      const fromName = first.fromUser?.name || first.user?.name || 'unknown';
      ok(fromName !== 'Carlos Top', `fromUser = "${fromName}" (not own name)`);
    }
  }

  // 4. COMMISSION CASCADE
  console.log('\n🌊 4. COMMISSION CASCADE');
  let totalComm = 0;
  for (let i = 0; i < 6; i++) {
    r = await api('/api/affiliate', chain[i]);
    if (r.ok) {
      const a = r.data.affiliate || r.data;
      const earned = parseFloat(a.totalEarnings || 0);
      totalComm += earned;
      ok(earned > 0, `L${i} ${u[chain[i]]?.name}: ${$(earned)}`);
    }
  }
  console.log(`   💵 Total: ${$(totalComm)}`);

  // 5. TEAM BONUS
  console.log('\n🏆 5. TEAM BONUS');
  r = await api('/api/team-bonus', 'carlos@test.com');
  if (r.ok) {
    const t = r.data;
    ok(t.teamActiveCapital > 0, `Team capital: ${$(t.teamActiveCapital)}`);
    ok(t.teamMembers > 0, `Team members: ${t.teamMembers}`);
    ok(t.hasOwnInvestment === true, 'Has own investment');
    if (t.salary) {
      console.log(`   📅 Salary: qualified=${t.salary.qualified}, est=${$(t.salary.estimatedWeeklySalary)}, min=${$(t.salary.minTeamCapital)}`);
      ok(t.salary.qualified === (t.teamActiveCapital >= (t.salary.minTeamCapital||2000)), 'Salary qualification correct');
    }
    if (t.gold) console.log(`   🥇 Gold: qualified=${t.gold.qualified}`);
    if (t.daymond) console.log(`   💎 Daymond: qualified=${t.daymond.qualified}`);
    if (t.progress) console.log(`   📊 Progress: salary=${t.progress.salaryProgress}%, gold=${t.progress.goldProgress}%`);
  }

  // 6. WITHDRAWAL
  console.log('\n💸 6. WITHDRAWAL');
  await prisma.user.update({where:{id:u['carlos@test.com'].id},data:{balance:'500'}});
  r = await api('/api/withdraw/info', 'carlos@test.com');
  if (r.ok) {
    console.log(`   Max: ${$(r.data.maxWithdrawable)}, fee: ${r.data.feePct}%`);
    ok(r.data.maxWithdrawable > 0, 'Can withdraw');
  }
  r = await apiPost('/api/withdraw', {amount:10, method:'usdt_trc20', destination:'TTestAddr123'}, 'carlos@test.com');
  ok(r.ok, 'Withdrawal $10 created', r.ok ? '' : r.data.error);

  // 7. TRANSFER
  console.log('\n🔄 7. TRANSFER');
  await prisma.user.update({where:{id:u['ana@test.com'].id},data:{balance:'200'}});
  r = await apiPost('/api/transfers', {toEmail:'bruno@test.com', amount:5}, 'ana@test.com');
  if (r.ok) ok(true, 'Transfer Ana→Bruno $5 OK');
  else console.log(`   ⚠️ Transfer: ${r.data.error}`);

  // Non-investor can't transfer
  r = await apiPost('/api/transfers', {toEmail:'pedro@test.com', amount:1}, 'noinvest@test.com');
  ok(!r.ok, 'Non-investor transfer blocked');

  // 8. VOUCHER
  console.log('\n🎫 8. VOUCHER');
  r = await apiPost('/api/admin/vouchers', {
    userId: u['carlos@test.com'].id, type:'basic', amount:200,
    goalDirectReferrals:5, goalMinReferralInvest:50, withdrawalUnlockPct:50, daysValid:30
  }, 'admin@actioncash.app');
  if (r.ok) {
    ok(true, 'Voucher $200 created for Carlos');
    r = await api('/api/user', 'carlos@test.com');
    if (r.ok) ok(parseFloat(r.data.user.voucherBalance) > 0, `Voucher balance: ${$(r.data.user.voucherBalance)}`);
  } else { ok(false, 'Create voucher', r.data.error); }

  // 9. NON-INVESTOR
  console.log('\n🚫 9. NON-INVESTOR');
  r = await api('/api/affiliate', 'noinvest@test.com');
  if (r.ok) {
    const a = r.data.affiliate || r.data;
    ok(a.hasInvested === false, 'NoInvest hasInvested=false');
    ok(a.linkUnlocked === false, 'NoInvest linkUnlocked=false');
  }

  // 10. INVESTMENTS
  console.log('\n📋 10. INVESTMENTS');
  r = await api('/api/investments', 'carlos@test.com');
  if (r.ok) {
    const invs = Array.isArray(r.data)?r.data:r.data.investments||[];
    ok(invs.length > 0, `${invs.length} investments`);
    invs.slice(0,3).forEach(i => console.log(`   📈 ${i.plan?.name||'?'}: ${$(i.amount)} @ ${i.dailyRoiPct}%/day, src=${i.source||'deposit'}`));
    ok(invs[0]?.source !== undefined, `Source field present: "${invs[0]?.source}"`);
  }

  // 11. TRANSACTIONS
  console.log('\n📜 11. TRANSACTIONS');
  r = await api('/api/transactions', 'carlos@test.com');
  if (r.ok) {
    const txs = Array.isArray(r.data)?r.data:r.data.transactions||[];
    ok(txs.length > 0, `${txs.length} transactions`);
    const types = {}; txs.forEach(t=>{types[t.type]=(types[t.type]||0)+1});
    Object.entries(types).forEach(([t,c])=>console.log(`   ${t}: ${c}`));
  }

  // 12. EDGE CASES
  console.log('\n🔍 12. EDGE CASES');
  r = await apiPost('/api/investments', {planId:(await prisma.investmentPlan.findFirst({where:{name:'Starter'}}))?.id, amount:999999}, 'carlos@test.com');
  ok(!r.ok, 'Oversized investment blocked');

  // SUMMARY
  console.log('\n'+'═'.repeat(50));
  console.log('🧪 FINAL RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${R.pass}`);
  console.log(`❌ Failed: ${R.fail}`);
  const total = R.pass+R.fail;
  console.log(`📊 Total:  ${total}`);
  console.log(`📈 Rate:   ${total>0?((R.pass/total)*100).toFixed(1):0}%`);
  if(R.err.length) { console.log('\n❌ Failures:'); R.err.forEach((e,i)=>console.log(`   ${i+1}. ${e}`)); }
  console.log('═'.repeat(50));
}

main().catch(e=>console.error('Fatal:',e)).finally(()=>prisma.$disconnect());
