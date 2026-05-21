# 📋 PLANEJAMENTO — Sistema de 3 Saldos com Bloqueio por Origem (Abordagem B)

## 🎯 PRINCÍPIO FUNDAMENTAL

> **O voucher só bloqueia lucros de investimentos feitos com voucher.**
> Depósitos próprios e lucros de investimentos próprios são SEMPRE livres para saque.

---

## 🔍 AUDITORIA DO SISTEMA ATUAL

### ✅ O que já está CORRETO

| Regra | Status | Local |
|---|---|---|
| 3 saldos separados (balance, voucherBalance, affiliateBalance) | ✅ OK | `prisma/schema.prisma` linhas 27-29 |
| Saldo de voucher NUNCA pode ser sacado como dinheiro | ✅ OK | `/api/withdraw` só deduz de `balance` |
| Saldo de afiliado é independente (sem bloqueio voucher) | ✅ OK | `/api/affiliate/withdraw` sem verificação de voucher |
| Voucher só serve para investir em planos | ✅ OK | `/api/vouchers/use` e `/api/investments` com `useVoucher=true` |
| Desbloqueio gradual 25%→50%→75%→100% | ✅ OK | `/api/vouchers/progress` calcula os tiers |
| Voucher expirado = saldo removido | ✅ OK | Deduz `voucherBalance` quando expira |

### ❌ O que está ERRADO

#### PROBLEMA 1: Bloqueio de saque afeta TODO o saldo (Abordagem A — global)

**Situação atual** (`/api/withdraw/route.ts` linhas 69-100):

```
Se tem voucher com unlock 0% → BLOQUEIA SAQUE TOTAL (nem depósitos próprios!)
Se unlock 50% → Pode sacar 50% do SALDO INTEIRO (inclui depósitos + todos os lucros)
```

**O que deveria ser (Abordagem B — por origem):**

```
Se tem voucher com unlock 0% → Pode sacar depósitos próprios + lucros próprios (lucros de voucher bloqueados)
Se unlock 50% → Pode sacar depósitos + lucros próprios + 50% dos lucros de voucher
```

#### PROBLEMA 2: Campo `source` não existe no modelo Investment

Não há como distinguir quais investimentos vieram de voucher vs depósito próprio. O campo `VoucherUsage` existe, mas não é eficiente para queries.

**Solução:** Adicionar `source String @default("deposit")` ao Investment.

#### PROBLEMA 3: Campo `totalDeposited` não existe no modelo User

O modelo User tem `totalWithdrawn` mas **NÃO tem `totalDeposited`**. Sem isso, não dá para saber quanto do saldo é dinheiro próprio vs lucro.

#### PROBLEMA 4: Frontend não mostra breakdown do saldo

O diálogo de saque não mostra:
- Quanto é depósito próprio (sempre liberado)
- Quanto é lucro próprio (sempre liberado)
- Quanto é lucro de voucher (bloqueado pelo voucher)
- Qual o máximo sacável no momento

---

## 🧮 FÓRMULA — Abordagem B (Bloqueio por Origem)

### Componentes do Saldo

```
balance = totalDeposited + totalOwnProfits + totalVoucherProfits - totalInvestedFromBalance - totalWithdrawn
```

Onde:
- `totalDeposited` = total depositado pelo usuário (NOVO campo)
- `totalOwnProfits` = SOMA(RoiHistory.totalRoi) para investimentos com source='deposit'
- `totalVoucherProfits` = SOMA(RoiHistory.totalRoi) para investimentos com source='voucher'
- `totalInvestedFromBalance` = SOMA(Investment.amount) para investimentos com source='deposit'
- `totalWithdrawn` = total já sacado (já existe)

### Cálculo do Máximo Sacável

```typescript
// 1. Se NÃO tem voucher ativo → tudo liberado
if (activeVouchers.length === 0) {
  maxWithdrawable = currentBalance;
}

// 2. Se TEM voucher ativo → separar por origem
else {
  // Maior % de desbloqueio entre todos os vouchers ativos
  const maxUnlockPct = Math.max(...activeVouchers.map(v => d(v.withdrawalUnlockPct)));

  // Fontes próprias no saldo (FIFO: saques primeiro consomem fontes próprias)
  const ownSourceTotal = totalDeposited + totalOwnProfits - totalInvestedFromBalance;
  const ownSourceInBalance = Math.max(0, ownSourceTotal - totalWithdrawn);

  // Lucros de voucher no saldo
  const voucherProfitsWithdrawn = Math.max(0, totalWithdrawn - Math.max(0, ownSourceTotal));
  const voucherProfitsInBalance = Math.max(0, totalVoucherProfits - voucherProfitsWithdrawn);

  // Fórmula final
  maxWithdrawable = Math.min(
    ownSourceInBalance + (voucherProfitsInBalance * maxUnlockPct / 100),
    currentBalance
  );
}
```

### Exemplos Práticos

#### Exemplo 1: Voucher ativo com 0% desbloqueio
```
Depósito próprio: $500 → investiu $500 do saldo
Voucher: $500 → investiu do voucherBalance
Lucros próprios (10 dias): $250
Lucros do voucher (10 dias): $250
Balance atual: $500
Saques anteriores: $0

ownSourceInBalance = max(0, 500 + 250 - 500 - 0) = $250
voucherProfitsInBalance = max(0, 250 - 0) = $250
maxWithdrawable = min(250 + (250 × 0%), 500) = $250  ← Pode sacar lucros próprios!
```

#### Exemplo 2: Voucher com 50% desbloqueio
```
Mesmo cenário, mas unlockPct = 50%
maxWithdrawable = min(250 + (250 × 50%), 500) = min(375, 500) = $375
```

#### Exemplo 3: Sem voucher
```
maxWithdrawable = currentBalance = $500 (tudo liberado)
```

#### Exemplo 4: Depósito próprio sem investir, voucher investindo
```
Depósito: $500 no saldo (não investiu)
Voucher: $500 investiu do voucherBalance
Lucros do voucher: $100
Balance: $600

ownSourceInBalance = max(0, 500 + 0 - 0 - 0) = $500
voucherProfitsInBalance = $100
Com unlock 0%: maxWithdrawable = min(500 + 0, 600) = $500 ← Depósito sempre livre!
```

---

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### Etapa 1: Schema — Adicionar campos ao Prisma

**Arquivo:** `prisma/schema.prisma`

**User model** — adicionar `totalDeposited`:
```prisma
totalDeposited      String   @default("0")       // USDT total deposited by user (own money)
```

**Investment model** — adicionar `source`:
```prisma
source              String   @default("deposit") // "deposit" (own balance) or "voucher" (voucher balance)
```

**Executar:** `bun run db:push`

### Etapa 2: Popular `totalDeposited` e `source` nos pontos de entrada

| Ação | Arquivo | Mudança |
|---|---|---|
| Depósito NowPayments confirmado | `/api/nowpayments/webhook/route.ts` linha 208 | Incrementar `totalDeposited` ao creditar `balance` |
| Depósito manual aprovado pelo admin | `/api/admin/deposits/route.ts` linha 93 | Incrementar `totalDeposited` ao creditar `balance` |
| Investimento do saldo | `/api/investments/route.ts` (regular flow) | `source: 'deposit'` no `investment.create` |
| Investimento do voucher | `/api/investments/route.ts` (voucher flow) | `source: 'voucher'` no `investment.create` |

### Etapa 3: Reescrever lógica de saque

**Arquivo:** `/api/withdraw/route.ts`

Substituir as linhas 69-100 (bloqueio global) pela nova lógica de bloqueio por origem:

```typescript
// ========== VOUCHER WITHDRAWAL LOCK CHECK (Abordagem B — por origem) ==========
const activeVouchers = await db.voucher.findMany({
  where: { userId: session.userId, status: 'active' },
});

let maxWithdrawable: number;
let voucherLockInfo: { ownSource: number; voucherProfits: number; unlockPct: number } | null = null;

if (activeVouchers.length === 0) {
  // SEM voucher → tudo liberado
  maxWithdrawable = d(user.balance);
} else {
  // COM voucher → calcular bloqueio por origem
  const maxUnlockPct = Math.max(...activeVouchers.map(v => d(v.withdrawalUnlockPct)));

  // Total depositado pelo usuário
  const totalDeposited = d(user.totalDeposited);

  // Total investido do saldo próprio
  const ownInvestments = await db.investment.aggregate({
    where: { userId: session.userId, source: 'deposit' },
    _sum: { amount: true },
  });
  const totalInvestedFromBalance = d(ownInvestments._sum.amount);

  // Lucros por origem
  const depositInvestmentIds = (await db.investment.findMany({
    where: { userId: session.userId, source: 'deposit' },
    select: { id: true },
  })).map(i => i.id);

  const voucherInvestmentIds = (await db.investment.findMany({
    where: { userId: session.userId, source: 'voucher' },
    select: { id: true },
  })).map(i => i.id);

  const ownProfits = await db.roiHistory.aggregate({
    where: { userId: session.userId, investmentId: { in: depositInvestmentIds } },
    _sum: { totalRoi: true },
  });
  const totalOwnProfits = d(ownProfits._sum.totalRoi);

  const voucherProfits = await db.roiHistory.aggregate({
    where: { userId: session.userId, investmentId: { in: voucherInvestmentIds } },
    _sum: { totalRoi: true },
  });
  const totalVoucherProfits = d(voucherProfits._sum.totalRoi);

  // Calcular fontes próprias no saldo (FIFO)
  const ownSourceTotal = totalDeposited + totalOwnProfits - totalInvestedFromBalance;
  const ownSourceInBalance = Math.max(0, ownSourceTotal - d(user.totalWithdrawn));

  // Calcular lucros de voucher no saldo (FIFO: saques primeiro consomem fontes próprias)
  const voucherProfitsWithdrawn = Math.max(0, d(user.totalWithdrawn) - Math.max(0, ownSourceTotal));
  const voucherProfitsInBalance = Math.max(0, totalVoucherProfits - voucherProfitsWithdrawn);

  voucherLockInfo = {
    ownSource: ownSourceInBalance,
    voucherProfits: voucherProfitsInBalance,
    unlockPct: maxUnlockPct,
  };

  maxWithdrawable = Math.min(
    ownSourceInBalance + (voucherProfitsInBalance * maxUnlockPct / 100),
    d(user.balance)
  );
}

// Validar saque contra o máximo permitido
if (data.amount > maxWithdrawable) {
  if (voucherLockInfo) {
    return apiError(
      `Saque máximo disponível: ${dusdt(maxWithdrawable)} USDT. ` +
      `Recursos próprios: ${dusdt(voucherLockInfo.ownSource)} USDT (sempre liberado). ` +
      `Lucros de voucher: ${dusdt(voucherLockInfo.voucherProfits)} USDT (desbloqueado: ${voucherLockInfo.unlockPct}%).`
    );
  }
  return apiError('Saldo insuficiente');
}
```

### Etapa 4: Atualizar frontend — diálogo de saque com breakdown

Mostrar breakdown claro no diálogo de saque:

```
💰 Saldo Total: $600.00 USDT
├── 💵 Recursos próprios: $350.00 USDT ✅ Sempre liberado
├── 📈 Lucros de voucher: $250.00 USDT ⚠️ 50% desbloqueado
└── 🎯 Máximo sacável: $475.00 USDT
```

Criar **novo endpoint** `/api/withdraw/breakdown` que retorna:
```json
{
  "balance": "600.00",
  "ownSource": "350.00",
  "voucherProfits": "250.00",
  "unlockPct": 50,
  "maxWithdrawable": "475.00"
}
```

### Etapa 5: Migration para usuários existentes

Criar endpoint admin `/api/admin/migrate/balance-source`:
1. Popular `totalDeposited` = SOMA de todos os depósitos confirmados (Deposit where type='deposit' and status='confirmed')
2. Popular `source='deposit'` para investimentos existentes sem VoucherUsage
3. Popular `source='voucher'` para investimentos existentes com VoucherUsage

### Etapa 6: Atualizar saque NowPayments

**Arquivo:** `/api/nowpayments/withdraw/route.ts`
- Aplicar a mesma lógica de bloqueio por origem
- Ou: delegar a validação para `/api/withdraw` e usar NowPayments só para o payout

---

## 📊 RESUMO DAS MUDANÇAS

| # | Mudança | Arquivos | Prioridade |
|---|---|---|---|
| 1 | Adicionar `totalDeposited` ao User e `source` ao Investment | `prisma/schema.prisma` | 🔴 Alta |
| 2 | Popular `totalDeposited` em depósitos confirmados | `webhook`, `admin/deposits` | 🔴 Alta |
| 3 | Popular `source` em criação de investimentos | `api/investments/route.ts` | 🔴 Alta |
| 4 | Reescrever lógica de saque com bloqueio por origem | `api/withdraw/route.ts` | 🔴 Alta |
| 5 | Endpoint breakdown para o frontend | novo `api/withdraw/breakdown` | 🔴 Alta |
| 6 | Frontend mostrar breakdown no diálogo de saque | `page.tsx` | 🟡 Média |
| 7 | Migration para usuários existentes | novo `api/admin/migrate/balance-source` | 🟡 Média |
| 8 | Atualizar saque NowPayments com mesma lógica | `api/nowpayments/withdraw/route.ts` | 🟡 Média |

---

## 🎯 DIAGRAMA DO RESULTADO FINAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SALDO PRINCIPAL (balance)                        │
├─────────────────────────────┬───────────────────────────────────────┤
│   💵 RECURSOS PRÓPRIOS      │   📈 LUCROS DE VOUCHER               │
│                             │                                       │
│   • Depósitos próprios      │   • ROI de investimentos              │
│     (totalDeposited -       │     financiados por voucher           │
│      totalInvestedFromBal - │     (source='voucher')                │
│      totalWithdrawn)        │                                       │
│   • Lucros de investimentos │   ⚠️ SEM voucher: 100% livre         │
│     próprios (source=       │   ⚠️ COM voucher: bloqueado           │
│     'deposit')              │     conforme unlockPct                │
│                             │   ✅ Desbloqueia:                     │
│   ✅ SEMPRE SACÁVEL         │     25% → 50% → 75% → 100%          │
└─────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────────────┐
│  🎫 VOUCHER BALANCE  │  │  🤝 AFFILIATE BALANCE        │
│                      │  │                              │
│  • Recebido de líder │  │  • Comissões de referência   │
│  • Só pode investir  │  │  • Bônus de rank/metas       │
│  • NUNCA sacável     │  │  • ✅ SEMPRE SACÁVEL          │
│    como dinheiro     │  │    (independente de voucher)  │
└──────────────────────┘  └──────────────────────────────┘

Fórmula: maxWithdrawable = ownSourceInBalance + (voucherProfitsInBalance × unlockPct / 100)
Sem voucher: maxWithdrawable = balance (tudo liberado)
```

---

## ⚠️ DECISÃO DE DESIGN: FIFO para saques

Quando o usuário saca dinheiro, assumimos que ele está sacando **primeiro os recursos próprios** (depósitos + lucros próprios), e **depois os lucros de voucher**. Isso é favorável ao usuário e é o comportamento esperado.

**Alternativa considerada:** Proporcional (cada saque retira proporcionalmente de cada fonte). Rejeitada por ser mais complexa e menos intuitiva.

---

**⏳ Aguardando aprovação para implementar.**
