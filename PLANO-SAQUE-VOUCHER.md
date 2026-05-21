# 📋 PLANEJAMENTO — Sistema de Saque com Bloqueio de Voucher

## 🔍 AUDITORIA DO SISTEMA ATUAL vs. DESIGN PROPOSTO

---

## ✅ O que já está CORRETO no sistema atual

| Regra | Status | Detalhes |
|---|---|---|
| 3 saldos separados (balance, voucherBalance, affiliateBalance) | ✅ OK | Model User tem os 3 campos |
| Saldo de voucher NUNCA pode ser sacado | ✅ OK | A rota `/api/withdraw` só deduz de `balance` |
| Saldo de afiliado é independente (sem bloqueio voucher) | ✅ OK | `/api/affiliate/withdraw` usa `affiliateBalance`, sem verificação de voucher |
| Voucher só serve para investir em planos | ✅ OK | `/api/vouchers/use` e `/api/investments` com `useVoucher=true` |
| Desbloqueio gradual 25%→50%→75%→100% | ✅ OK | `/api/vouchers/progress` calcula os tiers |
| Voucher expirado = saldo removido | ✅ OK | Deduz `voucherBalance` quando expira |

---

## ❌ O que está ERRADO e precisa mudar

### PROBLEMA 1: Bloqueio de saque afeta TODO o saldo (inclui depósitos próprios)

**Situação atual** (linha 84-99 de `/api/withdraw/route.ts`):
```
Se tem voucher com unlock 0% → BLOQUEIA SAQUE TOTAL (nem depósitos próprios saca)
Se unlock 50% → Pode sacar 50% do SALDO TOTAL (inclui depósitos + lucros)
```

**O que deveria ser:**
```
Se tem voucher com unlock 0% → Pode sacar 100% dos DEPÓSITOS PRÓPRIOS, lucros bloqueados
Se unlock 50% → Pode sacar 100% dos depósitos + 50% dos lucros
```

**Fórmula correta:**
```
dinheiroPróprio = totalDeposited - totalWithdrawn
lucros = balance - dinheiroPróprio  (se negativo, lucros = 0)
maxWithdrawable = dinheiroPróprio + (lucros × unlockPct / 100)
```

**Se NÃO tem voucher ativo:**
```
maxWithdrawable = balance inteiro (100% liberado, sem restrição)
```

---

### PROBLEMA 2: Campo `totalDeposited` não existe no modelo User

O modelo User tem `totalWithdrawn` mas **NÃO tem `totalDeposited`**. Precisamos saber quanto o usuário depositou para separar "dinheiro próprio" de "lucros".

**Atualmente:** `balance` é uma mistura de depósitos + lucros — não dá pra separar.

**Solução:** Adicionar campo `totalDeposited` no modelo User e atualizar sempre que um depósito for confirmado.

---

### PROBLEMA 3: Frontend não mostra quanto pode sacar

O diálogo de saque atual não mostra:
- Quanto é dinheiro próprio (sempre liberado)
- Quanto é lucro (bloqueado/desbloqueado pelo voucher)
- Qual o máximo sacável no momento

O usuário só vê "Saldo: $500" e tenta sacar $500, mas recebe erro sem entender por quê.

---

### PROBLEMA 4: Quando NÃO tem voucher, comportamento está correto mas inconsistente

Se o usuário NÃO tem voucher ativo, o código pula a verificação e deixa sacar 100%. Isso está correto. Mas a lógica fica espalhada — seria melhor ter a fórmula unificada.

---

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### Etapa 1: Adicionar campo `totalDeposited` ao modelo User

**Arquivo:** `prisma/schema.prisma`
- Adicionar `totalDeposited String @default("0")` ao modelo User
- Rodar `bun run db:push`

**Arquivos a atualizar para popular o campo:**
- Quando depósito NowPayments for confirmado (webhook) → incrementar `totalDeposited`
- Quando depósito manual for aprovado pelo admin → incrementar `totalDeposited`
- Endpoint `/api/admin/deposits` (aprovar depósito) → incrementar `totalDeposited`

### Etapa 2: Reescrever lógica de saque em `/api/withdraw/route.ts`

**Nova lógica:**
```typescript
// 1. Calcular dinheiro próprio e lucros
const totalDeposited = d(user.totalDeposited);
const totalWithdrawn = d(user.totalWithdrawn);
const currentBalance = d(user.balance);
const dinheiroProprio = Math.max(0, totalDeposited - totalWithdrawn);
const lucros = Math.max(0, currentBalance - dinheiroProprio);

// 2. Verificar vouchers ativos
const activeVouchers = await db.voucher.findMany({
  where: { userId: session.userId, status: 'active' },
});

let maxWithdrawable: number;

if (activeVouchers.length === 0) {
  // SEM voucher → tudo liberado
  maxWithdrawable = currentBalance;
} else {
  // COM voucher → aplicar desbloqueio gradual SÓ nos lucros
  let maxUnlockPct = 0;
  for (const v of activeVouchers) {
    const unlockPct = d(v.withdrawalUnlockPct);
    if (unlockPct > maxUnlockPct) maxUnlockPct = unlockPct;
  }
  // Depósitos próprios: SEMPRE 100% liberado
  // Lucros: liberados conforme unlockPct
  maxWithdrawable = dinheiroProprio + (lucros * maxUnlockPct / 100);
}

// 3. Validar saque
if (data.amount > maxWithdrawable) {
  return apiError(`Saque máximo disponível: ${dusdt(maxWithdrawable)} USDT. ` +
    `Dinheiro próprio: ${dusdt(dinheiroProprio)} USDT (sempre liberado). ` +
    `Lucros: ${dusdt(lucros)} USDT (desbloqueado: ${maxUnlockPct}%).`);
}
```

### Etapa 3: Atualizar o frontend — diálogo de saque

Mostrar breakdown claro no diálogo de saque:
```
💰 Saldo Total: $600.00 USDT
├── Depósitos próprios: $500.00 USDT ✅ Sempre liberado
├── Lucros de mineração: $100.00 USDT ⚠️ 50% desbloqueado
└── Máximo sacável: $550.00 USDT
```

### Etapa 4: Atualizar webhook do NowPayments

**Arquivo:** `/api/nowpayments/webhook/route.ts`
- Quando `payment_status` = `finished` ou `confirmed`:
  - Creditar `balance` (já faz)
  - **INCREMENTAR `totalDeposited`** (novo)

### Etapa 5: Atualizar aprovação de depósito manual pelo admin

**Arquivo:** `/api/admin/deposits/route.ts`
- Quando admin aprova depósito:
  - Creditar `balance` (já faz)
  - **INCREMENTAR `totalDeposited`** (novo)

### Etapa 6: Migration de dados para usuários existentes

Para usuários já existentes que já depositaram, precisamos popular `totalDeposited`:
- Criar endpoint admin `/api/admin/migrate/total-deposited`
- Somar todos os depósitos confirmados (status `confirmed`/`completed`) do modelo Deposit/Investment
- Atualizar `totalDeposited` de cada usuário

---

## 📊 RESUMO DAS MUDANÇAS

| # | Mudança | Arquivos | Prioridade |
|---|---|---|---|
| 1 | Adicionar `totalDeposited` ao User | `prisma/schema.prisma` | 🔴 Alta |
| 2 | Populgar `totalDeposited` em depósitos confirmados | webhook, admin/deposits | 🔴 Alta |
| 3 | Reescrever lógica de saque com separação depósitos/lucros | `api/withdraw/route.ts` | 🔴 Alta |
| 4 | Frontend mostrar breakdown no diálogo de saque | `page.tsx` | 🟡 Média |
| 5 | Migration para usuários existentes | novo endpoint admin | 🟡 Média |
| 6 | Atualizar saque NowPayments (se existir) | `api/nowpayments/withdraw/route.ts` | 🟡 Média |

---

## 🎯 RESULTADO FINAL ESPERADO

```
┌─────────────────────────────────────────────────┐
│              SALDO PRINCIPAL (balance)           │
├──────────────────────┬──────────────────────────┤
│  💰 Depósitos Próprios│  📈 Lucros (ROI cron)    │
│  totalDeposited -     │  balance - depósitos     │
│  totalWithdrawn       │                          │
│                      │                          │
│  ✅ SEMPRE sacável    │  ⚠️ SEM voucher: 100%    │
│                      │  ⚠️ COM voucher: bloqueado│
│                      │     conforme metas        │
│                      │  ✅ Desbloqueia:          │
│                      │     25%→50%→75%→100%     │
└──────────────────────┴──────────────────────────┘

Fórmula: maxWithdrawable = depósitosPróprios + (lucros × unlockPct / 100)
Sem voucher: maxWithdrawable = balance (tudo liberado)
```

---

**⏳ Aguardando aprovação para implementar.**
