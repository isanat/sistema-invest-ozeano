# 📋 ACTIONCASH — Roadmap de Implementação

> **REGRA:** Nenhum item será implementado sem aprovação explícita do usuário.
> Marque `[x]` nos itens que deseja implementar e informe a ordem de prioridade.

---

## 🔧 GRUPO A — Configurações (Sem código, só Admin)

Estes itens podem ser resolvidos entrando no painel Admin e alterando os valores. Não exigem nenhuma alteração no código-fonte.

---

### AC-01 — ROI Diário: 5% → 3.3%

| Campo | Valor Atual | Valor ActionCash |
|-------|------------|-----------------|
| `daily_roi_pct` | 5 | 3.3 |
| Planos (todos) | 5% | 3.3% |

**Como fazer via Admin:**
1. Admin → Config → categoria "Trading" → alterar `daily_roi_pct` para `3.3`
2. Admin → Planos → editar cada plano → alterar ROI diário para `3.3`

**⚠️ Atenção:**
- Investimentos JÁ ATIVOS continuarão com o ROI antigo (5%) até expirarem — o sistema salva `dailyRoiPct` no momento da criação do investimento
- Apenas NOVOS investimentos receberão 3.3%
- Se quiser que investimentos ativos também mudem, precisa de código adicional (update em massa)

**Pergunta a decidir:** Investimentos ativos devem manter 5% ou migrar para 3.3%?

---

### AC-02 — Níveis de Afiliado: 11 níveis → 6 níveis

| Nível | Atual | ActionCash |
|-------|-------|------------|
| 1 | 10% | **5%** |
| 2 | 4% | **3%** |
| 3 | 3% | **1%** |
| 4 | 2% | **1%** |
| 5 | 1.5% | **1%** |
| 6 | 1% | **2%** |
| 7 | 0.8% | *(desativar)* |
| 8 | 0.5% | *(desativar)* |
| 9 | 0.4% | *(desativar)* |
| 10 | 0.3% | *(desativar)* |
| 11 | 0.5% | *(desativar)* |

**Total:** 23.5% → 13%

**Como fazer via Admin:**
1. Admin → Níveis de Afiliado → editar níveis 1-6 com as novas %
2. Desativar níveis 7-11 (marcar `isActive = false`)

**⚠️ Atenção:**
- Comissões de níveis 7-11 que já foram pagas não são afetadas
- Novas comissões pararão nos nível 6
- A redução de 23.5% para 13% significa MENOS saída de dinheiro do sistema (mais sustentável)

---

### AC-03 — Investimento Mínimo: $10 → $5

| Campo | Valor Atual | Valor ActionCash |
|-------|------------|-----------------|
| `min_investment_usdt` | 10 | 5 |
| Plano Starter minAmount | 10 | 5 |

**Como fazer via Admin:**
1. Admin → Config → Trading → `min_investment_usdt` para `5`
2. Admin → Planos → Starter → minAmount para `5`

**Impacto:** Permite usuários com menos capital entrarem na plataforma.

---

### AC-04 — Retiro Mínimo: $10 → $5

| Campo | Valor Atual | Valor ActionCash |
|-------|------------|-----------------|
| `min_withdrawal_usdt` | 10 | 5 |

**Como fazer via Admin:**
1. Admin → Config → Retiradas → `min_withdrawal_usdt` para `5`

**⚠️ Atenção:** Retiros muito baixos podem gerar muitas transações pequenas com taxas de rede proporcionais altas.

---

### AC-06 — Taxa de Saque: 0% → 5%

| Campo | Valor Atual | Valor ActionCash |
|-------|------------|-----------------|
| `withdrawal_fee_pct` | 0 | 5 |

**Como fazer via Admin:**
1. Admin → Config → Retiradas → `withdrawal_fee_pct` para `5`

**Exemplo:** Saque de $100 → taxa $5 → líquido $95

**Impacto:** Gera receita para a plataforma a cada saque. O usuário vê a taxa antes de confirmar.

---

### AC-08 — Duração dos Planos: 25-40 dias → 60 dias

| Plano | Duração Atual | ActionCash |
|-------|-------------|------------|
| Starter | 40 dias | 60 dias |
| Growth | 35 dias | 60 dias |
| Premium | 30 dias | 60 dias |
| Elite | 25 dias | 60 dias |
| VIP | 40 dias | 60 dias |

**Como fazer via Admin:**
1. Admin → Planos → editar cada plano → `durationDays` para `60`

**⚠️ Atenção:**
- Com ROI 3.3% × 60 dias = 198% de retorno total (quase dobra o investimento)
- Investimentos ativos NÃO são afetados — a duração é salva no momento da criação

---

## 🔨 GRUPO B — Funcionalidades que exigem código novo

Estes itens NÃO existem no sistema e precisam ser desenvolvidos.

---

### AC-05 — Rede Primária: TRC20 → BEP20 (BSC)

**Estado atual:**
- O NowPayments JÁ suporta USDT BSC (`usdtbsc` no currency map)
- O modelo `NowPaymentsSubAccount` NÃO tem campo `depositAddressUsdtBSC`
- A UI mostra TRC20 e Polygon como opções principais, BSC como secundária

**O que precisa ser feito:**
1. **Prisma:** Adicionar campo `depositAddressUsdtBsc String?` no modelo `NowPaymentsSubAccount`
2. **API deposit:** Adicionar lógica para gerar endereço BSC via NowPayments sub-partner
3. **UI:** Colocar BEP20 como primeira opção na lista de redes de depósito
4. **Admin Config:** Adicionar `usdt_bsc_address` como config de depósito
5. **Withdraw:** Adicionar `usdt_bsc` como método de saque válido

**Complexidade:** 🟡 Média (2-3 horas)
**Dependência:** Precisa de credenciais NowPayments que suportem BSC

---

### AC-07 — Retiro Automático via NowPayments Payout

**Estado atual:**
- O código do NowPayments Payout JÁ EXISTE (`/api/nowpayments/withdraw/route.ts`)
- O toggle `nowpayments_withdrawal_enabled` já existe no config
- Porém está DESATIVADO (`false`) e sem credenciais configuradas

**O que precisa ser feito:**
1. **Configurar credenciais:** Adicionar no Vercel env vars: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD`, `NOWPAYMENTS_2FA_SECRET`
2. **Ativar toggle:** Admin → Config → `nowpayments_withdrawal_enabled` para `true`
3. **Fluxo automático:** Quando um usuário solicita saque, o sistema cria automaticamente um payout via NowPayments que envia USDT para a carteira do usuário

**⚠️ Atenção:**
- Retiro automático significa que o sistema envia crypto SEM aprovação manual do admin
- Risco: se houver bug ou fraude, o dinheiro sai automaticamente
- Recomendação: implementar com limite diário e/ou whitelist de endereços

**Complexidade:** 🟢 Baixa (1 hora) — se as credenciais já estiverem configuradas

---

### AC-09 — Salário Semanal (0.5% do capital ativo del equipo)

**Especificação ActionCash:**
- Todo domingo, cada usuário recebe 0.5% do capital ativo do seu equipo
- **Requisito:** Ter pelo menos $2.000 USDT em investimentos ativos no equipo
- **Exemplo:** Si la inversión de tu equipo es de $2.000 → ganas $10 por semana
- "Capital ativo del equipo" = soma de todos os investimentos ativos dos referidos (todos os níveis)

**Como funcionaria tecnicamente:**

```
Novo modelo Prisma: WeeklySalary
  - id, userId, weekDate, teamActiveCapital, salaryPct, salaryAmount, status, createdAt

Novo endpoint: /api/cron/weekly-salary (POST)
  - Roda todo domingo (Vercel Cron ou similar)
  - Para cada usuário com investimentos ativos:
    1. Calcular capital ativo total del equipo (soma de investimentos ativos de TODOS os referidos)
    2. Se capital >= $2.000: pagar 0.5% do capital
    3. Creditar no balance do usuário
    4. Criar transação tipo "weekly_salary"

Novo config no SystemConfig:
  - weekly_salary_enabled (boolean, default: false)
  - weekly_salary_pct (number, default: 0.5)
  - weekly_salary_min_team_capital (number, default: 2000)
```

**Perguntas a decidir:**
1. "Equipo" = todos os níveis de referidos ou só diretos?
2. O valor muda conforme o rank (Bronze/Prata/Ouro)?
3. Paga no `balance` ou no `affiliateBalance`?
4. Precisa ter investimento próprio ativo também?

**Complexidade:** 🔴 Alta (4-6 horas)

---

### AC-10 — ACTION GOLD (50% do salário semanal dos diretos)

**Especificação ActionCash:**
- Ganhe 50% do que seus referidos DIRETOS ganham do salário semanal
- **Requisito:** Ter $4.000+ em investimentos ativos del equipo
- **Exemplo:** Se tu directo gana del sueldo semanal $10 → tu ganarás $5 por semana

**Como funcionaria tecnicamente:**

```
Extensão do cron semanal (AC-09):
  - Após pagar os salários semanais:
    1. Para cada usuário que recebeu salário semanal:
       2. Encontrar quem o indicou (referer direto)
       3. Verificar se o referer tem $4.000+ em capital ativo del equipo
       4. Se sim: pagar 50% do salário semanal do indicado para o referer
       5. Creditar no balance/affiliateBalance do referer

Novo config no SystemConfig:
  - action_gold_enabled (boolean, default: false)
  - action_gold_pct (number, default: 50)
  - action_gold_min_team_capital (number, default: 4000)
```

**Perguntas a decidir:**
1. Os 50% são do salário bruto ou líquido do direto?
2. O bônus Action Gold de um direto também gera Action Gold para o referer acima? (cascata?)
3. Paga no `balance` ou `affiliateBalance`?

**Complexidade:** 🟡 Média (2-3 horas) — depende do AC-09 estar pronto

---

### AC-11 — ACTION DAYMOND (Pacote de $1.000/mês)

**Especificação ActionCash:**
- Receba um pacote de 1.000 USDT por mês com rendimientos (ROI diário)
- **Requisito:** Ter $20.000+ em investimentos ativos del equipo
- **Exemplo:** Si la inversión total de tu equipo es de $20.000 → ganarás un paquete de $1.000 con ROI diario

**Como funcionaria tecnicamente:**

```
Opção A — Investimento virtual automático:
  - Todo mês, o sistema cria automaticamente um "Investimento Daymond" de $1.000
  - Esse investimento gera ROI diário (3.3%) como qualquer outro
  - Duração: 30 dias
  - Se o equipo cair abaixo de $20.000, o pacote não é renovado no mês seguinte

Opção B — Crédito mensal direto:
  - Todo mês, creditar $1.000 no balance do usuário
  - Sem investimento, sem ROI — valor fixo

Novo modelo Prisma: DaymondPackage
  - id, userId, month, teamActiveCapital, packageAmount, investmentId?, status, createdAt

Novo config no SystemConfig:
  - action_daymond_enabled (boolean, default: false)
  - action_daymond_package_amount (number, default: 1000)
  - action_daymond_min_team_capital (number, default: 20000)
```

**Perguntas a decidir:**
1. Opção A (investimento com ROI) ou Opção B (crédito direto)? A spec diz "con rendimientos" → Opção A
2. O pacote gera comissões de afiliado para os uplines?
3. Se o equipo cair abaixo de $20.000 no meio do mês, o pacote é cancelado?
4. O usuário precisa ter investimento próprio ativo?

**Complexidade:** 🔴 Alta (4-5 horas) — depende do AC-09 para cálculo de equipo

---

### AC-12 — Transferência Interna de Saldo

**Especificação ActionCash:**
- ✅ Transferencia interna de saldo
- Usuários podem transferir saldo entre si dentro da plataforma

**Como funcionaria tecnicamente:**

```
Sistema que já existia antes (foi removido/broken):
  - Rota: POST /api/transfers — criar transferência
  - Rota: GET /api/transfers — listar transferências do usuário
  - Rota: GET /api/transfers/lookup — buscar destinatário por email/código

  Anti-fraude:
  - Admin deve ativar (transfer_enabled = false por padrão)
  - Só investidores podem enviar (hasInvested = true)
  - Taxa de 1% (configurável: transfer_fee_pct)
  - Limite de 5/dia (configurável: transfer_daily_limit)
  - Cooldown de 30 min entre transferências (configurável: transfer_cooldown_minutes)
  - Bloqueio atômico com PostgreSQL FOR UPDATE

  Modelo Prisma: Transfer (precisa ser recriado)
    - id, fromUserId, toUserId, amount, fee, netAmount, status, createdAt

  Config no SystemConfig (precisa ser recriado):
    - transfer_enabled (boolean)
    - transfer_fee_pct (number)
    - transfer_daily_limit (number)
    - transfer_cooldown_minutes (number)
    - transfer_min_amount (number)
    - transfer_max_amount (number)

  Enum category em validations.ts:
    - Adicionar 'transfer' ao enum de categorias
```

**Perguntas a decidir:**
1. Manter as mesmas regras anti-fraude (1% taxa, 5/dia, 30min cooldown)?
2. Transferência permite voucherBalance ou só balance regular?
3. Destinatário precisa ser investidor também?

**Complexidade:** 🔴 Alta (4-5 horas) — precisa recriar modelo, API, UI, e configs

---

## 📊 ORDEM SUGERIDA DE IMPLEMENTAÇÃO

### Fase 1 — Configs rápidas (1 hora, sem código)
| Item | Ação | Tempo |
|------|------|-------|
| AC-01 | ROI 5% → 3.3% | 5 min |
| AC-03 | Inv. mínimo $10 → $5 | 5 min |
| AC-04 | Retiro mínimo $10 → $5 | 5 min |
| AC-06 | Taxa saque 0% → 5% | 5 min |
| AC-08 | Duração planos → 60 dias | 10 min |
| AC-02 | Níveis afiliado → 6 níveis | 15 min |

### Fase 2 — Funcionalidades médias (3-5 horas de código)
| Item | Ação | Tempo |
|------|------|-------|
| AC-07 | Retiro automático (ativar NowPayments) | 1 hora |
| AC-05 | Rede BEP20 como primária | 2-3 horas |

### Fase 3 — Funcionalidades grandes (10-15 horas de código)
| Item | Ação | Tempo | Dependência |
|------|------|-------|-------------|
| AC-09 | Salário Semanal | 4-6 horas | — |
| AC-10 | ACTION GOLD | 2-3 horas | AC-09 |
| AC-11 | ACTION DAYMOND | 4-5 horas | AC-09 |
| AC-12 | Transferência Interna | 4-5 horas | — |

---

## ✅ CHECKLIST DE APROVAÇÃO

Marque com `[x]` os itens que deseja implementar:

- [ ] AC-01 — ROI Diário 3.3%
- [ ] AC-02 — Níveis Afiliado ActionCash (6 níveis)
- [ ] AC-03 — Investimento Mínimo $5
- [ ] AC-04 — Retiro Mínimo $5
- [ ] AC-05 — Rede BEP20 primária
- [ ] AC-06 — Taxa de Saque 5%
- [ ] AC-07 — Retiro Automático
- [ ] AC-08 — Duração Planos 60 dias
- [ ] AC-09 — Salário Semanal 0.5%
- [ ] AC-10 — ACTION GOLD
- [ ] AC-11 — ACTION DAYMOND
- [ ] AC-12 — Transferência Interna

---

*Documento criado em: Março 2025*
*Última atualização: Aguardando aprovação do usuário*
