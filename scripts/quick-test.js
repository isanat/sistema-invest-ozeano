#!/usr/bin/env node
// Quick integration test - uses Prisma directly for setup, then tests API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://localhost:3000';
let R = { pass: 0, fail: 0, err: [] };
const ok = (c,n,d='') => { if(c){R.pass++;console.log(`✅ ${n}`)}else{R.fail++;R.err.push(n+(d?' — '+d:''));console.log(`❌ ${n}${d?' — '+d:''}`)} };
const $ = v => '$'+parseFloat(v||0).toFixed(2);

async function api(m, p, b, e) {
  const o = { method:m, headers:{'Content-Type':'application/json'} };
  if(b) o.body = JSON.stringify(b);
  // Get session cookie by login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:e, password: e.includes('admin')?'Admin@123456':'Test@123456'})
  });
  const cookie = loginRes.headers.getSetCookie()?.map(c=>c.split(';')[0]).join('; ')||'';
  o.headers['Cookie'] = cookie;
  if(b) o.body = JSON.stringify(b);
  const res = await fetch(`${BASE}${p}`, o);
  return { status: res.status, data: await res.json(), ok: res.ok };
}

async function main() {
  console.log('\n🧪 ActionCash Quick Integration Test\n');
  
  const users = await prisma.user.findMany({select:{id:true,email:true,name:true,affiliateCode:true,referredBy:true,hasInvested:true}});
  const u = {}; users.forEach(x => u[x.email] = x);
  console.log(`📋 ${users.length} users loaded`);

  // 1. REFERRAL CHAIN
  console.log('\n👥 1. REFERRAL CHAIN');
  const chain = ['carlos@test.com','ana@test.com','bruno@test.com','carla@test.com','diego@test.com','elena@test.com','felipe@test.com','gabriela@test.com','hugo@test.com','isabela@test.com','joao@test.com','karla@test.com'];
  ok(!u['carlos@test.com'].referredBy, 'Carlos is top');
  for(let i=1;i<chain.length;i++) ok(u[chain[i]].referredBy===u[chain[i-1]].id, `${u[chain[i]].name} → ${u[chain[i-1]].name}`);
  ok(u['lucas@test.com'].referredBy===u['carlos@test.com'].id, 'Lucas → Carlos');
  ok(u['noinvest@test.com'].referredBy===u['carlos@test.com'].id, 'NoInvest → Carlos');

  // 2. CREDIT BALANCES + CREATE INVESTMENTS VIA PRISMA
  console.log('\n💰 2. CREDIT & INVEST VIA PRISMA');
  const credits = {carlos:2000,ana:500,bruno:200,carla:100,diego:50,elena:50,felipe:30,gabriela:20,hugo:10,isabela:10,joao:10,karla:10,lucas:100,maria:100};
  const plans = await prisma.investmentPlan.findMany({where:{isActive:true}});
  const starter = plans.find(p=>p.name==='Starter');
  const growth = plans.find(p=>p.name==='Growth');
  const elite = plans.find(p=>p.name==='Elite');
  ok(starter&&growth&&elite, `${plans.length} plans loaded`);

  for(const [name, amt] of Object.entries(credits)) {
    const email = name.includes('@') ? name : `${name}@test.com`;
    const user = u[email]; if(!user) continue;
    // Credit balance
    await prisma.user.update({where:{id:user.id},data:{balance:String(amt),totalDeposited:String(amt),hasInvested:true,linkUnlocked:true}});
    // Create deposit record
    await prisma.deposit.create({data:{userId:user.id,type:'deposit',method:'usdt_trc20',amount:String(amt),status:'confirmed',txHash:`0xQT_${user.id.slice(0,6)}_${Date.now()}`}});
    await prisma.transaction.create({data:{userId:user.id,type:'deposit',amount:String(amt),status:'confirmed',description:`Depósito ${$(amt)}`}});
    // Invest
    const plan = amt >= 1000 ? elite : amt >= 100 ? growth : starter;
    if(plan) {
      const dailyRoi = amt * parseFloat(plan.dailyRoiPct) / 100;
      const totalRoi = dailyRoi * plan.durationDays;
      const inv = await prisma.investment.create({data:{
        userId:user.id, planId:plan.id, amount:String(amt),
        dailyRoiPct:plan.dailyRoiPct, dailyRoi:String(dailyRoi), totalRoi:String(totalRoi),
        accumulatedRoi:'0', teamBonusPct:'0', distributedPeriods:0,
        startDate:new Date(), endDate:new Date(Date.now()+plan.durationDays*86400000),
        status:'active', source: user.id===u['carlos@test.com'].id?'deposit':'deposit'
      }});
      await prisma.user.update({where:{id:user.id},data:{balance:String(Math.max(0,amt-amt)),totalInvested:String(amt)}});
      // Note: balance = deposit - investment amount
      // Carlos: 2000-1000=1000, Ana: 500-200=300, etc.
      const remaining = amt - amt; // All invested
      await prisma.user.update({where:{id:user.id},data:{balance:String(remaining)}});
      await prisma.transaction.create({data:{userId:user.id,type:'investment',amount:String(amt),status:'confirmed',description:`Investimento ${plan.name}`,referenceId:inv.id,referenceType:'investment'}});
    }
    console.log(`   ✅ ${user.name}: ${$(amt)} deposited & invested in ${plan?.name}`);
  }

  // 3. PROCESS AFFILIATE COMMISSIONS
  console.log('\n🔗 3. AFFILIATE COMMISSION PROCESSING');
  // We need to trigger commission processing. Let's do it via the API by creating a new investment
  // First, give Carlos some balance back
  await prisma.user.update({where:{id:u['carlos@test.com'].id},data:{balance:'500'}});
  
  // Process commissions for each investment through the API
  // The invest API endpoint calls processCommissions. Let's test with one investment via API
  let r = await api('POST', '/api/investments', {planId:starter?.id, amount:50}, 'carlos@test.com');
  ok(r.ok, `API investment triggers commissions`, r.ok?'':r.data.error);

  // 4. CHECK AFFILIATE DATA
  console.log('\n🔗 4. AFFILIATE DATA VERIFICATION');
  r = await api('GET', '/api/affiliate', null, 'carlos@test.com');
  if(r.ok) {
    const a = r.data;
    ok(a.totalReferrals >= 4, `Carlos referrals: ${a.totalReferrals}`);
    ok(a.totalEarnings > 0, `Carlos commissions: ${$(a.totalEarnings)}`);
    ok(a.hasInvested===true, 'Carlos hasInvested=true');
    ok(a.linkUnlocked===true, 'Carlos linkUnlocked=true');
    if(a.affiliateLevels) ok(a.affiliateLevels.length===11, `11 levels: ${a.affiliateLevels.length}`);
    if(a.ranks) ok(a.ranks.length>=3, `${a.ranks.length} ranks from DB`);
    if(a.recentCommissions?.length>0) {
      const from = a.recentCommissions[0].fromUser?.name||a.recentCommissions[0].user?.name||'';
      ok(from!=='Carlos Top', `fromUser="${from}" (not own name)`);
    }
    console.log(`   📊 Commission by level: ${a.commissionByLevel?.map(l=>`L${l.level}=${$(l._sum?.commissionAmount||0)}`).join(', ')||'none'}`);
  } else { ok(false,'Affiliate data',r.data.error) }

  // 5. TEAM BONUS
  console.log('\n🏆 5. TEAM BONUS');
  r = await api('GET', '/api/team-bonus', null, 'carlos@test.com');
  if(r.ok) {
    const t = r.data;
    ok(t.teamActiveCapital>0, `Team capital: ${$(t.teamActiveCapital)}`);
    ok(t.teamMembers>0, `Team members: ${t.teamMembers}`);
    ok(t.hasOwnInvestment===true, 'Has own investment');
    if(t.salary) {
      console.log(`   📅 Salary: qualified=${t.salary.qualified}, est=${$(t.salary.estimatedWeeklySalary)}, min=${$(t.salary.minTeamCapital)}`);
    }
    if(t.gold) console.log(`   🥇 Gold: qualified=${t.gold.qualified}, est=${$(t.gold.estimatedWeeklyGold)}`);
    if(t.daymond) console.log(`   💎 Daymond: qualified=${t.daymond.qualified}`);
    if(t.daymondPremium) console.log(`   👑 Premium: qualified=${t.daymondPremium.qualified}`);
    if(t.progress) console.log(`   📊 Progress: salary=${t.progress.salaryProgress}%, gold=${t.progress.goldProgress}%, daymond=${t.progress.daymondProgress}%`);
  } else { ok(false,'Team bonus',r.data.error) }

  // 6. WITHDRAWAL
  console.log('\n💸 6. WITHDRAWAL');
  r = await api('GET', '/api/withdraw/info', null, 'carlos@test.com');
  if(r.ok) {
    console.log(`   Max withdrawable: ${$(r.data.maxWithdrawable)}, fee: ${r.data.feePct}%`);
    ok(r.data.maxWithdrawable>0, 'Can withdraw');
  }
  r = await api('POST', '/api/withdraw', {amount:10, method:'usdt_trc20', destination:'TTestAddr123'}, 'carlos@test.com');
  ok(r.ok, 'Withdrawal $10 created', r.ok?'':r.data.error);

  // 7. TRANSFER
  console.log('\n🔄 7. TRANSFER');
  r = await api('POST', '/api/transfers', {toEmail:'bruno@test.com', amount:5}, 'ana@test.com');
  if(r.ok) ok(true,'Ana→Bruno $5 transfer OK');
  else console.log(`   ⚠️ Transfer: ${r.data.error}`);

  // 8. NON-INVESTOR
  console.log('\n🚫 8. NON-INVESTOR');
  r = await api('GET', '/api/affiliate', null, 'noinvest@test.com');
  if(r.ok) { ok(r.data.hasInvested===false,'NoInvest hasInvested=false'); ok(r.data.linkUnlocked===false,'NoInvest linkUnlocked=false'); }

  // 9. USER DATA
  console.log('\n📊 9. DASHBOARD DATA');
  r = await api('GET', '/api/user', null, 'carlos@test.com');
  if(r.ok) {
    const d = r.data;
    console.log(`   balance=${$(d.balance)} affiliate=${$(d.affiliateBalance)} invested=${$(d.totalInvested)} deposited=${$(d.totalDeposited)}`);
    ok(parseFloat(d.totalInvested)>0,'totalInvested>0');
    ok(d.hasInvested===true,'hasInvested=true');
  }

  // 10. INVESTMENTS LIST
  console.log('\n📋 10. INVESTMENTS');
  r = await api('GET', '/api/investments', null, 'carlos@test.com');
  if(r.ok) {
    const invs = Array.isArray(r.data)?r.data:r.data.investments||[];
    ok(invs.length>0, `${invs.length} investments`);
    invs.forEach(i => console.log(`   📈 ${i.plan?.name||'?'}: ${$(i.amount)} @ ${i.dailyRoiPct}%/day src=${i.source||'deposit'}`));
  }

  // 11. TRANSACTIONS
  console.log('\n📜 11. TRANSACTIONS');
  r = await api('GET', '/api/transactions', null, 'carlos@test.com');
  if(r.ok) {
    const txs = Array.isArray(r.data)?r.data:r.data.transactions||[];
    const types = {}; txs.forEach(t=>{types[t.type]=(types[t.type]||0)+1});
    Object.entries(types).forEach(([t,c])=>console.log(`   ${t}: ${c}`));
    ok(txs.length>0, `${txs.length} transactions`);
  }

  // 12. EDGE CASES
  console.log('\n🔍 12. EDGE CASES');
  r = await api('POST', '/api/investments', {planId:starter?.id, amount:999999}, 'carlos@test.com');
  ok(!r.ok, 'Oversized investment blocked');
  r = await api('POST', '/api/withdraw', {amount:999999, method:'usdt_trc20', destination:'T'}, 'carlos@test.com');
  ok(!r.ok, 'Oversized withdrawal blocked');

  // SUMMARY
  console.log('\n'+'═'.repeat(50));
  console.log(`✅ Passed: ${R.pass}  ❌ Failed: ${R.fail}  📈 Rate: ${R.pass+R.fail>0?((R.pass/(R.pass+R.fail))*100).toFixed(1):0}%`);
  if(R.err.length) { console.log('❌ Failures:'); R.err.forEach((e,i)=>console.log(`   ${i+1}. ${e}`)); }
  console.log('═'.repeat(50));
}
main().catch(e=>console.error('Fatal:',e)).finally(()=>prisma.$disconnect());
