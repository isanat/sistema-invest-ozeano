# 🔧 PLANO DE ENGENHARIA — Bônus de Equipe ActionCash

> **Objetivo:** Implementar as 3 funcionalidades que exigem código novo:  
> **AC-09 Salário Semanal**, **AC-10 ACTION GOLD**, **AC-11 ACTION DAYMOND**  
> Sem gaps, sem pontos fracos, completo para usuário e admin.

---

## 📐 ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Cron System                       │
├───────────────┬──────────────────┬──────────────────────────┤
│   DIÁRIO      │   SEMANAL        │   MENSAL                 │
│   00:00 UTC   │   Domingo 00:00  │   Dia 1° 00:00 UTC      │
│   (já existe) │   (NOVO)         │   (NOVO)                 │
├───────────────┼──────────────────┼──────────────────────────┤
│ ROI Diário    │ AC-09 Salário    │ AC-11 Daymond            │
│ Team Bonus    │ AC-10 Gold       │ Package Creation          │
│ Comissões     │                  │                          │
└───────────────┴──────────────────┴──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              calculateTeamActiveCapital()                    │
│         Função central compartilhada pelas 3 features       │
│                                                             │
│  User A → Level 1 refs → Level 2 refs → ... → Level 6     │
│     ↓                                                       │
│  Soma de Investment.amount WHERE status='active'            │
│  AND source != 'daymond'  ← PONTO CRÍTICO ANTI-FRAUDE     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        $2,000+ team     $4,000+ team    $20,000+ team
        ┌──────────┐    ┌──────────┐    ┌──────────────┐
        │ AC-09    │    │ AC-10    │    │ AC-11        │
        │ Salário  │    │ Gold     │    │ Daymond      │
        │ 0.5%/sem │    │ 50% dir. │    │ $1000/mês    │
        └──────────┘    └──────────┘    └──────────────┘
```

### Princípios de Design

1. **Idempotência:** Cada cron pode ser executado múltiplas vezes sem duplicar pagamentos (unique constraints)
2. **Atomicidade:** Todo crédito de saldo dentro de `db.$transaction()` com raw SQL
3. **Auditabilidade:** Cada pagamento gera registro em tabela própria + Transaction + AdminLog
4. **Configurabilidade:** Todos os thresholds, %, e on/off via SystemConfig (admin ajusta sem código)
5. **Sustentabilidade:** Cap diário de bônus, reserva mínima de 15%, Daymond NÃO conta para capital de equipe

---

## 🗄️ MUDANÇAS NO PRISMA SCHEMA

### 3 Novos Modelos

```prisma
// ============================================================================
// TEAM BONUS MODELS — AC-09 (Weekly Salary), AC-10 (Action Gold), AC-11 (Daymond)
// ============================================================================

model WeeklySalary {
  id            String   @id @default(cuid())
  userId        String
  weekDate      DateTime   // Domingo que este salário se refere (YYYY-MM-DD)
  teamActiveCapital String  // Capital ativo do equipo no momento do cálculo
  salaryPct     String   // % aplicado (ex: "0.5")
  salaryAmount  String   // Valor pago em USDT
  status        String   @default("paid") // paid, failed
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([userId, weekDate])   // ← Idempotência: 1 salário por usuário por semana
  @@index([userId])
  @@index([weekDate])
  @@index([status])
}

model ActionGoldPayment {
  id              String   @id @default(cuid())
  userId          String   // Quem RECEBEU o Gold
  fromUserId      String   // O referido direto cujo salário gerou este Gold
  weekDate        DateTime // Mesmo domingo do salário semanal
  fromSalaryAmount String  // Salário semanal que o direto recebeu
  goldPct         String   // % aplicado (ex: "50")
  goldAmount      String   // Valor pago em USDT
  status          String   @default("paid") // paid, failed
  createdAt       DateTime @default(now())

  user     User @relation(fields: [userId], references: [id], onDelete: Restrict)
  fromUser User @relation("GoldFromReferrals", fields: [fromUserId], references: [id], onDelete: Restrict)

  @@unique([userId, fromUserId, weekDate])  // ← 1 Gold por par (referer,direto) por semana
  @@index([userId])
  @@index([fromUserId])
  @@index([weekDate])
  @@index([status])
}

model DaymondPackage {
  id              String   @id @default(cuid())
  userId          String
  monthDate       DateTime // 1° do mês que este pacote se refere
  teamActiveCapital String // Capital ativo no momento da qualificação
  packageAmount   String   // $1000 (configurável)
  investmentId    String?  // Link para o Investment criado
  status          String   @default("qualified") // qualified, active, expired, skipped
  createdAt       DateTime @default(now())

  user       User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  investment Investment? @relation(fields: [investmentId], references: [id], onDelete: SetNull)

  @@unique([userId, monthDate])  // ← 1 pacote por usuário por mês
  @@index([userId])
  @@index([monthDate])
  @@index([status])
}
```

### Mudanças em Modelos Existentes

```prisma
// ─── Investment model ───
// Linha existente: source String @default("deposit") // "deposit" or "voucher"
// MUDAR PARA:
source String @default("deposit") // "deposit", "voucher", ou "daymond"

// ─── User model ─── Adicionar relações:
weeklySalaries     WeeklySalary[]
actionGoldPayments ActionGoldPayment[]
actionGoldFrom     ActionGoldPayment[] @relation("GoldFromReferrals")
daymondPackages    DaymondPackage[]

// ─── Investment model ─── Adicionar relação:
daymondPackage DaymondPackage?
```

### Mudanças no Enum de Transaction Type

```typescript
// Atual: type = 'deposit' | 'withdrawal' | 'roi_profit' | 'investment' | 'affiliate_commission' | 'admin_adjust'
// Adicionar: | 'weekly_salary' | 'action_gold' | 'daymond_package'
// Nota: o campo type é String livre, não enum do Prisma. Só precisa ser consistente no código.
```

---

## ⚙️ SYSTEMCONFIG — Novas Chaves

Todas na categoria `"team_bonus"` (nova categoria):

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `team_bonus_salary_enabled` | boolean | `false` | Liga/desliga salário semanal |
| `team_bonus_salary_pct` | number | `0.5` | % do capital ativo do equipo |
| `team_bonus_salary_min_team_capital` | number | `2000` | Mínimo de capital de equipo (USDT) |
| `team_bonus_salary_requires_own_investment` | boolean | `true` | Usuário precisa ter investimento próprio ativo |
| `team_bonus_gold_enabled` | boolean | `false` | Liga/desliga Action Gold |
| `team_bonus_gold_pct` | number | `50` | % do salário semanal dos diretos |
| `team_bonus_gold_min_team_capital` | number | `4000` | Mínimo de capital de equipo para Gold |
| `team_bonus_daymond_enabled` | boolean | `false` | Liga/desliga Action Daymond |
| `team_bonus_daymond_package_amount` | number | `1000` | Valor do pacote mensal em USDT |
| `team_bonus_daymond_min_team_capital` | number | `20000` | Mínimo de capital de equipo para Daymond |
| `team_bonus_daymond_duration_days` | number | `30` | Duração do investimento Daymond em dias |
| `team_bonus_daymond_generates_commissions` | boolean | `false` | Daymond gera comissões de afiliado? |
| `team_bonus_daily_cap_usd` | number | `0` | Cap diário total de bônus de equipe (0 = sem cap) |
| `team_bonus_max_depth` | number | `6` | Profundidade máxima de referidos para cálculo de equipo |

**Seed:** Estas 14 chaves devem ser adicionadas ao `prisma/seed.ts`.

---

## 🧠 FUNÇÃO CENTRAL: calculateTeamActiveCapital()

Esta é a função mais crítica do sistema. Ela é usada por AC-09, AC-10 e AC-11.

```typescript
// src/lib/team-bonus.ts

import { db } from './db';
import { d } from './auth';

/**
 * Calcula o capital ativo total do equipo de um usuário.
 * 
 * DEFINIÇÃO: "Capital ativo do equipo" = soma de todos os Investment.amount
 * onde: userId é um referido (qualquer nível até maxDepth)
 *   AND status = 'active'
 *   AND source != 'daymond'  ← CRÍTICO: Daymond NÃO conta (anti-inflação)
 * 
 * NOTA: O próprio investimento do usuário NÃO entra na soma.
 * Apenas os investimentos dos referidos (níveis 1 a maxDepth).
 */
export async function calculateTeamActiveCapital(
  userId: string,
  maxDepth: number = 6
): Promise<number> {
  let totalCapital = 0;
  let currentLevelIds = [userId];
  const visited = new Set<string>([userId]);

  for (let level = 1; level <= maxDepth; level++) {
    // Buscar todos os referidos diretos dos usuários do nível atual
    const referrals = await db.user.findMany({
      where: {
        referredBy: { in: currentLevelIds },
        isActive: true,
        id: { notIn: Array.from(visited) },
      },
      select: { id: true },
    });

    if (referrals.length === 0) break; // Sem mais níveis

    const referralIds = referrals.map(r => r.id);
    referralIds.forEach(id => visited.add(id));

    // Somar investimentos ativos DEPOSIT-FUNDED destes referidos
    // source != 'daymond' para evitar inflação artificial
    const result = await db.investment.aggregate({
      _sum: { amount: true },
      where: {
        userId: { in: referralIds },
        status: 'active',
        source: { not: 'daymond' },  // ← ANTI-FRAUDE
      },
    });

    totalCapital += d(result._sum.amount || '0');
    currentLevelIds = referralIds;
  }

  return totalCapital;
}

/**
 * Verifica se um usuário tem investimento próprio ativo (fonte: deposit ou voucher)
 */
export async function hasActiveInvestment(userId: string): Promise<boolean> {
  const count = await db.investment.count({
    where: {
      userId,
      status: 'active',
      source: { in: ['deposit', 'voucher'] },
    },
  });
  return count > 0;
}
```

### ⚠️ Ponto Crítico: Daymond NÃO conta para capital de equipe

**Por que?** Se o Daymond contasse, criaria um efeito cascata inflacionário:
1. Usuário A qualifica para Daymond → recebe investimento de $1.000
2. Esse $1.000 soma para o capital de equipe do upline B
3. B pode qualificar para Gold ou mais Daymond por causa desse $1.000
4. B's Daymond de $1.000 soma para o upline C... e assim por diante

**Resultado sem esta proteção:** Dinheiro virtual gerando mais dinheiro virtual em cascata. Insustentável.

---

## 📅 AC-09 — SALÁRIO SEMANAL (0.5% do Capital Ativo do Equipo)

### Especificação

| Campo | Valor |
|-------|-------|
| Frequência | Todo domingo, 00:00 UTC |
| Cálculo | `teamActiveCapital × 0.5%` |
| Requisito 1 | `teamActiveCapital >= $2,000` (configurável) |
| Requisito 2 | Usuário deve ter investimento próprio ativo (configurável) |
| Destino | `User.balance` (saldo principal, sacável) |
| Idempotência | `@@unique([userId, weekDate])` |

### Cron Endpoint

```
POST /api/cron/weekly-bonuses
```

### Lógica Completa

```typescript
export async function POST(request: NextRequest) {
  // 1. Autorização (CRON_SECRET ou Vercel header)
  if (!isCronAuthorized(request)) return apiError('Não autorizado', 401);

  // 2. Advisory lock (prevenir execução concorrente)
  const lockAcquired = await acquireAdvisoryLock(54321); // ID diferente do daily
  if (!lockAcquired) return apiError('Lock ocupado', 423);

  try {
    // 3. Buscar config
    const config = await getTeamBonusConfig();
    
    if (!config.salaryEnabled) {
      return apiSuccess({ message: 'Salário semanal desativado', processed: 0 });
    }

    // 4. Determinar data da semana (último domingo)
    const weekDate = getLastSunday(); // 00:00 UTC do domingo mais recente

    // 5. Buscar todos os usuários com investimento ativo
    const users = await db.user.findMany({
      where: {
        isActive: true,
        investments: { some: { status: 'active' } },
      },
      select: { id: true },
    });

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // 6. Verificar se já recebeu salário esta semana (idempotência)
        const existing = await db.weeklySalary.findUnique({
          where: { userId_weekDate: { userId: user.id, weekDate } },
        });
        if (existing) { skipped++; continue; }

        // 7. Verificar se tem investimento próprio ativo
        if (config.salaryRequiresOwnInvestment) {
          const hasOwn = await hasActiveInvestment(user.id);
          if (!hasOwn) { skipped++; continue; }
        }

        // 8. Calcular capital ativo do equipo
        const teamCapital = await calculateTeamActiveCapital(
          user.id, config.maxDepth
        );

        // 9. Verificar requisito mínimo
        if (teamCapital < config.salaryMinTeamCapital) { skipped++; continue; }

        // 10. Calcular salário
        const salaryAmount = teamCapital * (config.salaryPct / 100);
        if (salaryAmount <= 0) { skipped++; continue; }

        // 11. Check sustainability cap
        const capCheck = await checkTeamBonusDailyCap(salaryAmount);
        if (!capCheck.allowed) { skipped++; continue; }
        const finalAmount = Math.min(salaryAmount, capCheck.cappedAmount);

        // 12. Executar pagamento (atômico)
        await db.$transaction(async (tx) => {
          // Criar registro de salário
          await tx.weeklySalary.create({
            data: {
              userId: user.id,
              weekDate,
              teamActiveCapital: teamCapital.toFixed(8),
              salaryPct: config.salaryPct.toString(),
              salaryAmount: finalAmount.toFixed(8),
              status: 'paid',
            },
          });

          // Creditar saldo do usuário
          await tx.$executeRaw`
            UPDATE "User" SET 
              balance = CAST((CAST(balance AS NUMERIC) + ${finalAmount}) AS TEXT)
            WHERE id = ${user.id}
          `;

          // Criar transação para histórico
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'weekly_salary',
              amount: finalAmount.toFixed(8),
              status: 'completed',
              description: `Salário semanal: 0.5% de $${teamCapital.toFixed(2)} capital de equipo`,
              referenceType: 'WeeklySalary',
            },
          });
        });

        processed++;
      } catch (err) {
        console.error(`[WEEKLY] Error for user ${user.id}:`, err);
        errors.push(`User ${user.id}: ${err}`);
      }
    }

    return apiSuccess({
      message: `Salários semanais processados: ${processed} pagos, ${skipped} ignorados`,
      processed, skipped, errors: errors.length > 0 ? errors : undefined,
      weekDate: weekDate.toISOString(),
    });
  } finally {
    await releaseAdvisoryLock(54321);
  }
}
```

### Funções Auxiliares

```typescript
function getLastSunday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : day; // Se hoje é domingo, usa hoje; senão volta
  const sunday = new Date(now);
  sunday.setUTCDate(sunday.getUTCDate() - diff);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday;
}

async function getTeamBonusConfig() {
  const configs = await db.systemConfig.findMany({
    where: { category: 'team_bonus', isActive: true },
  });
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]));
  
  return {
    salaryEnabled: map.team_bonus_salary_enabled === 'true',
    salaryPct: d(map.team_bonus_salary_pct || '0.5'),
    salaryMinTeamCapital: d(map.team_bonus_salary_min_team_capital || '2000'),
    salaryRequiresOwnInvestment: map.team_bonus_salary_requires_own_investment !== 'false',
    goldEnabled: map.team_bonus_gold_enabled === 'true',
    goldPct: d(map.team_bonus_gold_pct || '50'),
    goldMinTeamCapital: d(map.team_bonus_gold_min_team_capital || '4000'),
    daymondEnabled: map.team_bonus_daymond_enabled === 'true',
    daymondPackageAmount: d(map.team_bonus_daymond_package_amount || '1000'),
    daymondMinTeamCapital: d(map.team_bonus_daymond_min_team_capital || '20000'),
    daymondDurationDays: parseInt(map.team_bonus_daymond_duration_days || '30'),
    daymondGeneratesCommissions: map.team_bonus_daymond_generates_commissions === 'true',
    dailyCapUsd: d(map.team_bonus_daily_cap_usd || '0'),
    maxDepth: parseInt(map.team_bonus_max_depth || '6'),
  };
}
```

---

## 🏆 AC-10 — ACTION GOLD (50% do Salário Semanal dos Diretos)

### Especificação

| Campo | Valor |
|-------|-------|
| Frequência | Todo domingo, APÓS o salário semanal |
| Cálculo | `50% × salarioSemanalDoDireto` |
| Requisito 1 | `teamActiveCapital >= $4,000` (configurável) |
| Requisito 2 | Ter investimento próprio ativo |
| Profundidade | APENAS diretos (nível 1) — NÃO cascata |
| Destino | `User.balance` (saldo principal) |
| Idempotência | `@@unique([userId, fromUserId, weekDate])` |

### ⚠️ Anti-Cascata (Ponto Crítico)

**Gold NÃO gera Gold.** Se B recebe Gold porque A (seu direto) recebeu salário,  
o Gold de B NÃO gera Gold para o upline de B. Caso contrário:

```
A recebe salário $10
  → B (pai de A) recebe Gold $5 (50% de $10)
    → C (pai de B) receberia Gold $2.50 (50% de $5)  ← PROIBIDO
      → D (pai de C) receberia Gold $1.25...         ← CASCATA INFINITA
```

**Implementação:** Gold é calculado SOMENTE sobre o `WeeklySalary.salaryAmount`,  
NUNCA sobre `ActionGoldPayment.goldAmount`.

### Lógica (executa DEPOIS do salário semanal no mesmo cron)

```typescript
// Dentro do mesmo endpoint /api/cron/weekly-bonuses, APÓS processar AC-09:

if (!config.goldEnabled) {
  // Skip Gold processing
} else {
  // Buscar todos os salários pagos esta semana
  const paidSalaries = await db.weeklySalary.findMany({
    where: { weekDate, status: 'paid' },
    select: { userId: true, salaryAmount: true },
  });

  for (const salary of paidSalaries) {
    try {
      // Encontrar o referer DIRETO (quem indicou este usuário)
      const salaryUser = await db.user.findUnique({
        where: { id: salary.userId },
        select: { referredBy: true },
      });

      if (!salaryUser?.referredBy) continue; // Sem referer

      const directReferrer = await db.user.findUnique({
        where: { id: salaryUser.referredBy },
        select: { id: true, isActive: true },
      });

      if (!directReferrer?.isActive) continue;

      // Verificar se já existe Gold payment para este par esta semana
      const existingGold = await db.actionGoldPayment.findUnique({
        where: {
          userId_fromUserId_weekDate: {
            userId: directReferrer.id,
            fromUserId: salary.userId,
            weekDate,
          },
        },
      });
      if (existingGold) continue;

      // Verificar se o referer tem capital de equipo suficiente
      const referrerTeamCapital = await calculateTeamActiveCapital(
        directReferrer.id, config.maxDepth
      );

      if (referrerTeamCapital < config.goldMinTeamCapital) continue;

      // Verificar se o referer tem investimento próprio ativo
      const referrerHasOwn = await hasActiveInvestment(directReferrer.id);
      if (!referrerHasOwn) continue;

      // Calcular Gold: 50% do salário semanal do direto
      const salaryAmount = d(salary.salaryAmount);
      const goldAmount = salaryAmount * (config.goldPct / 100);
      if (goldAmount <= 0) continue;

      // Check sustainability cap
      const capCheck = await checkTeamBonusDailyCap(goldAmount);
      if (!capCheck.allowed) continue;
      const finalGold = Math.min(goldAmount, capCheck.cappedAmount);

      // Executar pagamento
      await db.$transaction(async (tx) => {
        await tx.actionGoldPayment.create({
          data: {
            userId: directReferrer.id,
            fromUserId: salary.userId,
            weekDate,
            fromSalaryAmount: salary.salaryAmount,
            goldPct: config.goldPct.toString(),
            goldAmount: finalGold.toFixed(8),
            status: 'paid',
          },
        });

        await tx.$executeRaw`
          UPDATE "User" SET 
            balance = CAST((CAST(balance AS NUMERIC) + ${finalGold}) AS TEXT)
          WHERE id = ${directReferrer.id}
        `;

        await tx.transaction.create({
          data: {
            userId: directReferrer.id,
            type: 'action_gold',
            amount: finalGold.toFixed(8),
            status: 'completed',
            description: `Action Gold: ${config.goldPct}% do salário semanal de seu direto`,
            referenceType: 'ActionGoldPayment',
          },
        });
      });

      goldProcessed++;
    } catch (err) {
      console.error(`[GOLD] Error:`, err);
      errors.push(`Gold for salary ${salary.userId}: ${err}`);
    }
  }
}
```

---

## 💎 AC-11 — ACTION DAYMOND ($1.000/mês com ROI)

### Especificação

| Campo | Valor |
|-------|-------|
| Frequência | Dia 1° de cada mês, 00:00 UTC |
| O que acontece | Sistema cria um Investment de $1.000 com ROI 3.3%/dia por 30 dias |
| Requisito 1 | `teamActiveCapital >= $20,000` (configurável) |
| Requisito 2 | Ter investimento próprio ativo (deposit ou voucher) |
| Fonte | `source = 'daymond'` no Investment |
| Comissões | NÃO gera comissões de afiliado por padrão (configurável) |
| Capital de equipe | Daymond NÃO conta para capital de equipe de uplines |
| Renovação | Se equipo cair abaixo de $20.000, pacote NÃO é renovado |
| Destino do ROI | `User.balance` (como qualquer outro investimento) |
| Idempotência | `@@unique([userId, monthDate])` no DaymondPackage |

### Cron Endpoint

```
POST /api/cron/monthly-daymond
```

### Lógica Completa

```typescript
export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) return apiError('Não autorizado', 401);

  const lockAcquired = await acquireAdvisoryLock(67890);
  if (!lockAcquired) return apiError('Lock ocupado', 423);

  try {
    const config = await getTeamBonusConfig();

    if (!config.daymondEnabled) {
      return apiSuccess({ message: 'Daymond desativado', processed: 0 });
    }

    // Determinar mês atual
    const monthDate = new Date();
    monthDate.setUTCDate(1);
    monthDate.setUTCHours(0, 0, 0, 0);

    // Buscar ROI diário do sistema (config ou padrão 3.3%)
    const roiConfig = await db.systemConfig.findUnique({
      where: { key: 'daily_roi_pct' },
    });
    const dailyRoiPct = roiConfig ? d(roiConfig.value) : d('3.3');

    // Buscar todos os usuários com investimento ativo
    const users = await db.user.findMany({
      where: {
        isActive: true,
        investments: { some: { status: 'active' } },
      },
      select: { id: true },
    });

    let qualified = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Verificar se já tem pacote Daymond este mês
        const existing = await db.daymondPackage.findUnique({
          where: { userId_monthDate: { userId: user.id, monthDate } },
        });
        if (existing) { skipped++; continue; }

        // Verificar investimento próprio ativo
        const hasOwn = await hasActiveInvestment(user.id);
        if (!hasOwn) { skipped++; continue; }

        // Calcular capital de equipo
        const teamCapital = await calculateTeamActiveCapital(
          user.id, config.maxDepth
        );

        if (teamCapital < config.daymondMinTeamCapital) {
          // Registrar como "skipped" para auditoria
          await db.daymondPackage.create({
            data: {
              userId: user.id,
              monthDate,
              teamActiveCapital: teamCapital.toFixed(8),
              packageAmount: config.daymondPackageAmount.toFixed(8),
              status: 'skipped',
            },
          });
          skipped++;
          continue;
        }

        // QUALIFICADO — Criar pacote Daymond
        const packageAmount = config.daymondPackageAmount;
        const dailyRoi = packageAmount * (dailyRoiPct / 100);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setUTCDate(endDate.getUTCDate() + config.daymondDurationDays);

        const result = await db.$transaction(async (tx) => {
          // 1. Criar DaymondPackage
          const pkg = await tx.daymondPackage.create({
            data: {
              userId: user.id,
              monthDate,
              teamActiveCapital: teamCapital.toFixed(8),
              packageAmount: packageAmount.toFixed(8),
              status: 'active',
            },
          });

          // 2. Criar Investment (virtual, source='daymond')
          const investment = await tx.investment.create({
            data: {
              userId: user.id,
              amount: packageAmount.toFixed(8),
              dailyRoi: dailyRoi.toFixed(8),
              dailyRoiPct: dailyRoiPct.toString(),
              totalRoi: (dailyRoi * config.daymondDurationDays).toFixed(8),
              startDate,
              endDate,
              status: 'active',
              teamBonusPct: '0', // Daymond NÃO recebe team bonus
              source: 'daymond',
            },
          });

          // 3. Link DaymondPackage → Investment
          await tx.daymondPackage.update({
            where: { id: pkg.id },
            data: { investmentId: investment.id },
          });

          // 4. Transação de registro
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'daymond_package',
              amount: packageAmount.toFixed(8),
              status: 'completed',
              description: `Action Daymond: pacote de $${packageAmount.toFixed(2)} qualificado (${config.daymondDurationDays} dias, ${dailyRoiPct}% ROI/dia)`,
              referenceId: investment.id,
              referenceType: 'Investment',
            },
          });

          return { package: pkg, investment };
        });

        // 5. Se Daymond gera comissões, processar (fora da tx para evitar deadlocks)
        if (config.daymondGeneratesCommissions) {
          try {
            await processCommissions(
              user.id,
              packageAmount,
              'subscription',
              result.investment.id,
            );
          } catch (commErr) {
            console.error(`[DAYMOND] Commission error for ${user.id}:`, commErr);
          }
        }

        qualified++;
      } catch (err) {
        console.error(`[DAYMOND] Error for user ${user.id}:`, err);
        errors.push(`User ${user.id}: ${err}`);
      }
    }

    return apiSuccess({
      message: `Daymond: ${qualified} pacotes criados, ${skipped} sem qualificação`,
      qualified, skipped, errors: errors.length > 0 ? errors : undefined,
      monthDate: monthDate.toISOString(),
    });
  } finally {
    await releaseAdvisoryLock(67890);
  }
}
```

### Mudança no Cron Diário (ROI)

No arquivo `src/app/api/cron/distribute/route.ts`, a linha:

```typescript
// Atual:
if (investment.source !== 'voucher') {
  await processCommissions(investment.userId, totalRoiForToday, 'trading', roiHistoryId);
}
```

Deve ficar:

```typescript
// Novo: Daymond também NÃO gera comissões (a menos que configurado)
if (investment.source !== 'voucher' && investment.source !== 'daymond') {
  await processCommissions(investment.userId, totalRoiForToday, 'trading', roiHistoryId);
}
// Se daymond_generates_commissions = true, as comissões foram processadas 
// na criação do pacote (subscription), não no ROI diário.
```

---

## 🖥️ ENDPOINTS DE API — Usuário

### GET /api/team-bonus (MODIFICAR o existente)

Retorna dados consolidados de bônus de equipe para o usuário logado:

```typescript
{
  // Info geral
  teamActiveCapital: number,      // Capital ativo atual do equipo
  maxDepth: number,               // Profundidade máxima (6)
  
  // AC-09 - Salário Semanal
  salary: {
    enabled: boolean,
    qualified: boolean,            // teamCapital >= min?
    minTeamCapital: number,
    salaryPct: number,
    estimatedWeeklySalary: number, // Quanto receberia neste momento
    nextPaymentDate: string,       // Próximo domingo 00:00 UTC
    lastSalary: { amount, weekDate } | null,
    history: Array<{ weekDate, teamActiveCapital, salaryAmount }>,
  },
  
  // AC-10 - Action Gold
  gold: {
    enabled: boolean,
    qualified: boolean,
    minTeamCapital: number,
    goldPct: number,
    estimatedWeeklyGold: number,   // Baseado nos diretos que receberam salário
    lastGold: { amount, weekDate } | null,
    history: Array<{ weekDate, fromUserName, fromSalaryAmount, goldAmount }>,
  },
  
  // AC-11 - Action Daymond
  daymond: {
    enabled: boolean,
    qualified: boolean,
    minTeamCapital: number,
    packageAmount: number,
    currentMonthPackage: { status, investmentId } | null,
    history: Array<{ monthDate, teamActiveCapital, status, packageAmount }>,
  },
  
  // Progresso visual
  progress: {
    salaryProgress: number,    // 0-100% (teamCapital / minTeamCapital * 100)
    goldProgress: number,      // 0-100%
    daymondProgress: number,   // 0-100%
  }
}
```

### GET /api/team-bonus/salary-history
Histórico paginado de salários semanais.

### GET /api/team-bonus/gold-history
Histórico paginado de pagamentos Gold.

### GET /api/team-bonus/daymond-history
Histórico paginado de pacotes Daymond.

---

## 🛡️ ENDPOINTS DE API — Admin

### GET /api/admin/team-bonus
Dashboard admin de bônus de equipe:

```typescript
{
  config: { ...allTeamBonusConfigKeys },
  stats: {
    totalWeeklyPaid: number,       // Total pago em salários semanais (última semana)
    totalGoldPaid: number,         // Total pago em Gold (última semana)
    totalDaymondActive: number,    // Pacotes Daymond ativos
    totalDaymondAmount: number,    // $ total em investimentos Daymond ativos
    qualifiedForSalary: number,    // Usuários qualificados para salário
    qualifiedForGold: number,      // Usuários qualificados para Gold
    qualifiedForDaymond: number,   // Usuários qualificados para Daymond
  },
  recentSalaryPayments: WeeklySalary[],
  recentGoldPayments: ActionGoldPayment[],
  recentDaymondPackages: DaymondPackage[],
}
```

### PUT /api/admin/team-bonus/config
Atualizar configurações de team bonus (todas as 14 chaves SystemConfig).

### POST /api/admin/team-bonus/trigger-weekly
Trigger manual do cron semanal (para testes/debug).

### POST /api/admin/team-bonus/trigger-daymond
Trigger manual do cron mensal Daymond.

### GET /api/admin/team-bonus/salary
Listar todos os salários semanais (com filtros: userId, weekDate, status).

### GET /api/admin/team-bonus/gold
Listar todos os pagamentos Gold (com filtros).

### GET /api/admin/team-bonus/daymond
Listar todos os pacotes Daymond (com filtros).

---

## 🖼️ INTERFACE DO USUÁRIO

### Nova Seção: "Bônus Equipe" (dentro da tab "Afiliados" ou tab separada)

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 BÔNUS DE EQUIPE                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 Capital Ativo do Equipo: $12,500.00                     │
│  📊 Referidos ativos em 6 níveis: 47                        │
│                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ 📅 Salário     │ │ 🥇 Action Gold │ │ 💎 Daymond     │  │
│  │ Semanal        │ │                │ │                │  │
│  │                │ │                │ │                │  │
│  │ ✅ Qualificado │ │ ✅ Qualificado │ │ ❌ Não qualif. │  │
│  │                │ │                │ │                │  │
│  │ 0.5% de        │ │ 50% do salário │ │ $1,000/mês     │  │
│  │ $12,500        │ │ dos diretos    │ │ c/ ROI         │  │
│  │                │ │                │ │                │  │
│  │ = $62.50/sem   │ │ = $23.50/sem   │ │ Próx: $7,500   │  │
│  │                │ │                │ │                │  │
│  │ ████████░░ 80% │ │ ████████░░ 80% │ │ ████░░░░░░ 40% │  │
│  │ $2,000 mín     │ │ $4,000 mín     │ │ $20,000 mín    │  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
│                                                             │
│  📋 Histórico de Pagamentos                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Data        │ Tipo    │ Capital  │ Valor     │ Status│   │
│  │ 02/03/2025  │ Salário │ $12,000  │ $60.00    │ Pago  │   │
│  │ 02/03/2025  │ Gold    │ -        │ $22.50    │ Pago  │   │
│  │ 23/02/2025  │ Salário │ $11,500  │ $57.50    │ Pago  │   │
│  │ 01/03/2025  │ Daymond │ $22,000  │ $1,000    │ Ativo │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Próximo pagamento: Domingo, 09/03/2025 00:00 UTC          │
└─────────────────────────────────────────────────────────────┘
```

### Elementos UI Necessários

1. **3 Cards de Status** — Salário / Gold / Daymond
   - Badge: ✅ Qualificado / ❌ Não qualificado
   - Valor estimado do próximo pagamento
   - Barra de progresso (capital atual / mínimo necessário)
   - Texto do mínimo para qualificar

2. **Tabela de Histórico** — Paginada com filtros
   - Tipo (Salário/Gold/Daymond)
   - Data
   - Capital de equipo na época
   - Valor recebido
   - Status

3. **Countdown** — Próximo domingo 00:00 UTC (como o countdown de ROI diário)

4. **Detalhes do Gold** — Expandir para ver quais diretos contribuíram

---

## 🖥️ INTERFACE DO ADMIN

### Nova Tab: "Bônus Equipe" no painel admin

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 BÔNUS DE EQUIPE — Admin                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚙️ Configurações                                    │    │
│  │                                                     │    │
│  │ Salário Semanal    [✓] Ativado                      │    │
│  │   % do capital:    [0.5] %                          │    │
│  │   Capital mínimo:  [$2,000] USDT                    │    │
│  │   Requer inv. próprio: [✓]                         │    │
│  │                                                     │    │
│  │ Action Gold        [✓] Ativado                      │    │
│  │   % do salário direto: [50] %                       │    │
│  │   Capital mínimo:  [$4,000] USDT                    │    │
│  │                                                     │    │
│  │ Action Daymond     [✓] Ativado                      │    │
│  │   Valor do pacote: [$1,000] USDT                    │    │
│  │   Capital mínimo:  [$20,000] USDT                   │    │
│  │   Duração:         [30] dias                        │    │
│  │   Gera comissões:  [ ] (desativado)                 │    │
│  │                                                     │    │
│  │ Geral                                             │    │
│  │   Cap diário:      [$0] (0 = sem limite)           │    │
│  │   Profundidade equipe: [6] níveis                  │    │
│  │                                                     │    │
│  │ [💾 Salvar Configurações]                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐   │
│  │ $4,330  │ │ $1,850  │ │ 12 pkgs  │ │ 47 users       │   │
│  │ Salários│ │ Gold    │ │ Daymond  │ │ Qualificados   │   │
│  │ (sem)   │ │ (sem)   │ │ Ativos   │ │ (Total)        │   │
│  └─────────┘ └─────────┘ └──────────┘ └────────────────┘   │
│                                                             │
│  [🔄 Trigger Semanal]  [🔄 Trigger Daymond]                │
│                                                             │
│  📋 Últimos Pagamentos                                      │
│  [Filtro: Todos ▼] [Data: Esta semana ▼]                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Usuário    │ Tipo    │ Capital  │ Valor   │ Data     │   │
│  │ João S.    │ Salário │ $15,200  │ $76.00  │ 02/03/25 │   │
│  │ Maria L.   │ Gold    │ $5,400   │ $12.50  │ 02/03/25 │   │
│  │ Pedro R.   │ Daymond │ $22,000  │ $1,000  │ 01/03/25 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ ANTI-FRAUDE & SEGURANÇA

### 1. Daymond NÃO Conta para Capital de Equipe
**Problema:** Se Daymond contasse, criaria inflação cascata:
- A recebe Daymond $1.000 → B's team capital sobe → B qualifica Gold → etc.
**Solução:** `calculateTeamActiveCapital()` filtra `source: { not: 'daymond' }`

### 2. Gold Não Cascata
**Problema:** Gold sobre Gold sobre Gold = espiral inflacionária
**Solução:** Gold é calculado SOMENTE sobre `WeeklySalary.salaryAmount`, nunca sobre `ActionGoldPayment.goldAmount`

### 3. Cap Diário de Bônus
**Problema:** Se muitos usuários qualificarem no mesmo dia, saída de capital é enorme
**Solução:** `team_bonus_daily_cap_usd` limita total pago por dia. Se atingido, pagamentos são reduzidos proporcionalmente.

### 4. Requisito de Investimento Próprio
**Problema:** Usuário sem investimento próprio não deveria ganhar bônus de equipe
**Solução:** `team_bonus_salary_requires_own_investment = true` por padrão

### 5. Advisory Lock em Cada Cron
**Problema:** Vercel pode executar o cron 2x se o primeiro demorar
**Solução:** `acquireAdvisoryLock()` com IDs diferentes (54321 semanal, 67890 mensal)

### 6. Unique Constraints para Idempotência
**Problema:** Cron rodar 2x = pagar 2x
**Solução:**
- `@@unique([userId, weekDate])` em WeeklySalary
- `@@unique([userId, fromUserId, weekDate])` em ActionGoldPayment
- `@@unique([userId, monthDate])` em DaymondPackage

### 7. Contas Múltiplas (Sybil Attack)
**Problema:** Usuário cria 10 contas, investe mínimo em cada, infla capital de equipe
**Solução recomendada (futura):** KYC, detecção de mesmo IP/wallet, limite de contas por IP

### 8. Manipulação de Timing
**Problema:** Usuário investe grande quantidade sábado, qualifica para salário domingo, retira segunda
**Solução:** Capital de equipe é calculado NO MOMENTO do cron (domingo). Se investiu sábado e retirou segunda, o salário de domingo já foi calculado. Mas o cron mensal (Daymond) usa o capital calculado no dia 1°, que pode ser diferente.

---

## 📊 ANÁLISE DE SUSTENTABILIDADE

### Cenário 1: Usuário com $2,000 em equipo
| Item | Valor |
|------|-------|
| Salário semanal | $2,000 × 0.5% = $10/sem |
| Mensal | ~$43/mês |
| % sobre capital de equipo | 2.15%/mês |

### Cenário 2: Usuário com $4,000 em equipo + 1 direto com $2,000
| Item | Valor |
|------|-------|
| Salário semanal | $4,000 × 0.5% = $20/sem = ~$87/mês |
| Gold (1 direto) | 50% × $10 = $5/sem = ~$22/mês |
| Total bônus equipe | ~$109/mês |
| % sobre capital equipo | 2.7%/mês |

### Cenário 3: Usuário com $20,000 em equipo
| Item | Valor |
|------|-------|
| Salário semanal | $20,000 × 0.5% = $100/sem = ~$433/mês |
| Gold (3 diretos) | ~$45/sem = ~$195/mês |
| Daymond | $1,000 × 3.3% × 30 = $990 ROI/mês |
| **Total bônus equipe** | **~$1,618/mês** |
| % sobre capital equipo | 8.1%/mês |

### ⚠️ Alerta de Sustentabilidade

O Daymond é o mais impactante: $990/mês de ROI em investimento virtual.  
Se muitos usuários atingirem $20,000 de equipo, o custo mensal explode.

**Recomendações:**
1. Manter `daymondGeneratesCommissions = false` (padrão)
2. Ativar `team_bonus_daily_cap_usd` com valor conservador (ex: $5,000/dia)
3. Monitorar métricas: se `totalTeamBonusPaid > 10% do totalDeposited`, revisar %
4. Considerar reduzir `daymondPackageAmount` ou `salaryPct` se necessário

---

## 📁 ESTRUTURA DE ARQUIVOS

### Novos Arquivos
```
src/lib/team-bonus.ts                          ← calculateTeamActiveCapital(), hasActiveInvestment(), getTeamBonusConfig(), checkTeamBonusDailyCap()
src/app/api/cron/weekly-bonuses/route.ts       ← Cron semanal (AC-09 + AC-10)
src/app/api/cron/monthly-daymond/route.ts       ← Cron mensal (AC-11)
src/app/api/team-bonus/route.ts                 ← GET dados do usuário (modificar existente)
src/app/api/team-bonus/salary-history/route.ts  ← GET histórico salário
src/app/api/team-bonus/gold-history/route.ts    ← GET histórico gold
src/app/api/team-bonus/daymond-history/route.ts ← GET histórico daymond
src/app/api/admin/team-bonus/route.ts           ← GET dashboard + PUT config + POST triggers
src/app/api/admin/team-bonus/salary/route.ts    ← GET todos salários (admin)
src/app/api/admin/team-bonus/gold/route.ts      ← GET todos golds (admin)
src/app/api/admin/team-bonus/daymond/route.ts   ← GET todos daymonds (admin)
```

### Arquivos Modificados
```
prisma/schema.prisma                     ← 3 novos modelos + relações + source='daymond'
prisma/seed.ts                           ← 14 novas chaves SystemConfig
src/app/api/cron/distribute/route.ts     ← Pular comissões para source='daymond'
src/app/api/team-bonus/route.ts          ← Expandir resposta com dados AC-09/10/11
src/app/page.tsx                         ← UI: nova seção "Bônus Equipe" + admin tab
vercel.json                              ← 2 novos crons (weekly + monthly)
```

---

## 📋 ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Schema + Lib)
1. Adicionar 3 modelos ao `prisma/schema.prisma`
2. Adicionar relações ao User e Investment
3. Executar `bun run db:push`
4. Criar `src/lib/team-bonus.ts` com funções centrais
5. Adicionar 14 chaves ao `prisma/seed.ts` + rodar seed

### Fase 2: AC-09 Salário Semanal
6. Criar `src/app/api/cron/weekly-bonuses/route.ts` (parte do salário)
7. Adicionar cron semanal ao `vercel.json`
8. Criar endpoints de histórico do usuário
9. Testar com trigger manual

### Fase 3: AC-10 Action Gold
10. Adicionar lógica Gold ao cron semanal (após salário)
11. Criar endpoints de histórico Gold
12. Testar com trigger manual

### Fase 4: AC-11 Action Daymond
13. Criar `src/app/api/cron/monthly-daymond/route.ts`
14. Adicionar cron mensal ao `vercel.json`
15. Modificar cron diário para pular comissões em Daymond
16. Criar endpoints de histórico Daymond
17. Testar com trigger manual

### Fase 5: UI Usuário
18. Expandir `GET /api/team-bonus` com dados consolidados
19. Criar seção "Bônus Equipe" no dashboard (3 cards + histórico + countdown)

### Fase 6: UI Admin
20. Criar `PUT /api/admin/team-bonus/config`
21. Criar tab "Bônus Equipe" no admin (config + stats + triggers + tabela)

### Fase 7: Testes & Validação
22. Testar cenários extremos (0 capital, capital exato, múltiplos diretos)
23. Verificar idempotência (rodar cron 2x)
24. Verificar sustainability cap
25. Verificar que Daymond NÃO conta para team capital

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Descrição | Horas |
|------|-----------|-------|
| 1 | Fundação (Schema + Lib) | 1.5h |
| 2 | AC-09 Salário Semanal | 2h |
| 3 | AC-10 Action Gold | 1.5h |
| 4 | AC-11 Action Daymond | 2h |
| 5 | UI Usuário | 2.5h |
| 6 | UI Admin | 2.5h |
| 7 | Testes & Validação | 1h |
| **Total** | | **~13h** |

---

## ❓ DECISÕES PENDENTES (RESPONDER ANTES DE IMPLEMENTAR)

1. **"Equipe" = todos os 6 níveis ou só diretos?**  
   → Este plano assume **6 níveis** (configurável via `team_bonus_max_depth`)

2. **Daymond gera comissões de afiliado para uplines?**  
   → Este plano assume **NÃO** (padrão `daymondGeneratesCommissions = false`)  
   → Se SIM, o custo mensal do sistema aumenta significativamente

3. **Daymond conta para capital de equipe de uplines?**  
   → Este plano assume **NÃO** (anti-inflação cascata)  
   → Se SIM, precisa recalcular capital de equipo após cada Daymond

4. **Gold é 50% do salário base ou do salário + Gold do direto?**  
   → Este plano assume **50% do salário base APENAS** (anti-cascata)

5. **O que acontece se o equipo cair abaixo do mínimo no meio do período?**  
   → Este plano assume: **verificação no momento do cron** (domingo/me dia 1°)  
   → Não há "cancelamento retroativo" de bônus já pagos

---

*Documento criado em: Março 2025*  
*Pronto para implementação após aprovação das decisões pendentes*
