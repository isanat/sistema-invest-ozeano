# 🚀 Guia de Deploy - ActionCash

## 1. Variáveis de Ambiente no Vercel (OBRIGATÓRIO)

Acesse: https://vercel.com/dashboard → sistema-invest-ozeano → Settings → Environment Variables

Adicione as seguintes variáveis (para Production, Preview e Development):

### NowPayments (Obrigatório para depósitos/saques/splits)
| Variável | Valor |
|----------|-------|
| `NOWPAYMENTS_API_KEY` | Sua API key do NowPayments |
| `NOWPAYMENTS_EMAIL` | Seu email de login do NowPayments |
| `NOWPAYMENTS_PASSWORD` | Sua senha do NowPayments |
| `NOWPAYMENTS_IPN_SECRET` | Seu IPN secret (para verificação de webhook) |
| `NOWPAYMENTS_2FA_SECRET` | Seu TOTP secret (para verificação de payout) |
| `NOWPAYMENTS_BASE_URL` | `https://api.nowpayments.io/v1` |

### Banco de Dados (Neon PostgreSQL)
| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | String de conexão pooled (com `?sslmode=require`) |
| `DATABASE_URL_DIRECT` | String de conexão direta (opcional) |

### Segurança
| Variável | Valor |
|----------|-------|
| `JWT_SECRET` | String aleatória de 64 caracteres (gerar com `openssl rand -hex 32`) |
| `CRON_SECRET` | String aleatória de 32 caracteres (gerar com `openssl rand -hex 16`) |

### App
| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://sistema-invest-ozeano.vercel.app` |

## 2. Inicializar o Sistema (Primeiro Acesso)

Após configurar as variáveis, acesse a plataforma e registre o admin:

### Opção A: Via API (recomendado)
```bash
# 1. Verificar se o sistema precisa de setup
curl https://sistema-invest-ozeano.vercel.app/api/admin/setup

# 2. Criar admin via setup API
curl -X POST https://sistema-invest-ozeano.vercel.app/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "adminEmail": "SEU_EMAIL_ADMIN",
    "adminPassword": "SUA_SENHA_FORTE",
    "adminName": "Administrator"
  }'
```

### Opção B: Via Interface
1. Acesse https://sistema-invest-ozeano.vercel.app
2. Clique em "Registrarse"
3. Use as credenciais escolhidas no passo anterior
4. Depois, atualize o role para "admin" no banco de dados

## 3. Credenciais de Teste

| Tipo | Email | Senha |
|------|-------|-------|
| **Admin** | (definido no setup) | (definido no setup) |
| **Usuário** | (criar via registro) | (senha forte) |

Para criar o usuário de teste:
```bash
curl -X POST https://sistema-invest-ozeano.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "SEU_EMAIL_TESTE",
    "password": "SUA_SENHA_FORTE",
    "name": "Usuário Teste"
  }'
```

## 4. Configurar NowPayments no Painel Admin

Após login como admin:
1. Vá em **Admin → Configurações → NowPayments**
2. Clique em "Setup NowPayments" para criar as chaves de configuração
3. Configure:
   - `nowpayments_split_pct`: Porcentagem do split (ex: 10 para 10%)
   - `nowpayments_split_wallet`: Endereço USDT TRC20 da plataforma
4. Clique em "Testar Conexão" para verificar

## 5. Webhook do NowPayments

No dashboard do NowPayments (https://nowpayments.io):
1. Vá em Settings → IPN
2. Configure a URL de callback: `https://sistema-invest-ozeano.vercel.app/api/nowpayments/webhook`
3. Use o mesmo IPN_SECRET configurado nas variáveis

## 6. Verificação de Funcionamento

### Depositar (gerar endereço)
```bash
# Após login, chamar:
curl -X POST https://sistema-invest-ozeano.vercel.app/api/nowpayments/deposit \
  -H "Content-Type: application/json" \
  -H "Cookie: mp_session=TOKEN" \
  -d '{"amount": 50, "pay_currency": "usdttrc20"}'
```

### Sacar
```bash
curl -X POST https://sistema-invest-ozeano.vercel.app/api/nowpayments/withdraw \
  -H "Content-Type: application/json" \
  -H "Cookie: mp_session=TOKEN" \
  -d '{"amount": 10, "currency": "usdttrc20", "destination_address": "SEU_ENDERECO_USDT"}'
```

### Verificar status
```bash
curl "https://sistema-invest-ozeano.vercel.app/api/nowpayments/status?nowpaymentsPaymentId=PAYMENT_ID" \
  -H "Cookie: mp_session=TOKEN"
```
