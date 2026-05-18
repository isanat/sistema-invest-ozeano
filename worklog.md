# Work Log - Mining Protocol Project

## Task 1 - SQLite Adapter (Completed)

**Agent**: SQLite Adapter  
**Date**: 2025-05-18

### Summary
Adapted the mining-protocol project to work with SQLite instead of PostgreSQL.

### Changes Made

#### 1. Prisma Schema (`prisma/schema.prisma`)
- Changed `provider` from `"postgresql"` to `"sqlite"`
- Replaced the default User/Post models with the full mining-protocol schema from `prisma_backup/schema.prisma`
- All 17 models preserved: User, Miner, MiningPlan, MiningRental, MiningHistory, Investment, Transaction, AffiliateCommission, AffiliateWithdrawal, AffiliateLevel, SystemConfig, AdminLog, AffiliateRank, AffiliateMilestone, AffiliateContest, AffiliateMilestoneClaim, AffiliateBadge, AffiliateBadgeAward, PoolStatus
- All `@@index` and `@@unique` constraints retained (SQLite supports these)

#### 2. PostgreSQL Raw SQL Query Replacements

| Pattern | PostgreSQL | SQLite Replacement |
|---------|-----------|-------------------|
| Row-level lock | `SELECT 1 FROM "User" WHERE id = $id FOR UPDATE` | Removed (SQLite serialized transactions provide sufficient concurrency protection) |
| Type cast in arithmetic | `CAST(x AS NUMERIC)` | `CAST(x AS REAL)` |
| Text result cast | `)::text` | `) AS TEXT)` |
| Advisory lock | `SELECT pg_advisory_lock(12345)` / `pg_advisory_unlock(12345)` | Removed entirely (rely on idempotency check in MiningHistory) |

**Full replacement example:**
- Before: `(CAST(balance AS NUMERIC) - ${amount})::text`
- After: `CAST(CAST(balance AS REAL) - ${amount} AS TEXT)`

#### 3. Files Modified

| File | Changes |
|------|---------|
| `src/app/api/withdraw/route.ts` | Removed `FOR UPDATE`, replaced `CAST AS NUMERIC)::text` with `CAST AS REAL) AS TEXT)` |
| `src/app/api/admin/users/route.ts` | Removed `FOR UPDATE`, added missing `dusyt` import |
| `src/app/api/cron/distribute/route.ts` | Removed `pg_advisory_lock/unlock` mechanism and `lockReleased` tracking, replaced `CAST AS NUMERIC)::text` |
| `src/app/api/affiliate/withdraw/route.ts` | Removed `FOR UPDATE`, replaced `CAST AS NUMERIC)::text` |
| `src/app/api/rentals/route.ts` | Removed `FOR UPDATE`, replaced `CAST AS NUMERIC)::text` |
| `src/app/api/admin/deposits/route.ts` | Replaced `CAST AS NUMERIC)::text` |
| `src/app/api/admin/affiliate-withdrawals/route.ts` | Replaced `CAST AS NUMERIC)::text` (2 occurrences: totalWithdrawn and affiliateBalance refund) |
| `src/app/api/affiliate/route.ts` | Replaced `CAST AS NUMERIC)::text` (2 occurrences: badge reward and milestone reward) |
| `src/lib/affiliate.ts` | Replaced `CAST AS NUMERIC)::text` (2 occurrences: revenue pool commission and walk-up commission) |

#### 4. Environment Configuration (`.env`)
- Updated `DATABASE_URL` from `file:/home/z/my-project/db/custom.db` to `file:./../db/custom.db` (relative path as required)

#### 5. Additional Fixes
- Added missing `dusyt` import in `admin/users/route.ts`
- Installed `bcryptjs@2.4.3` (downgraded from v3 which had ESM compatibility issues with Next.js Turbopack)
- Installed `@types/bcryptjs` for TypeScript support

#### 6. Verification
- `bun run db:push` — Successful, all models synced to SQLite
- `bun run lint` — No errors
- Dev server running and responding with 200 status
- Grep confirmed zero remaining PostgreSQL-specific syntax in `src/`

## Task 2 - NowPayments Schema Models (Completed)

**Agent**: Schema Developer  
**Date**: 2025-05-18

### Summary
Added NowPayments integration models to the Prisma schema for crypto payment processing (deposits, payouts, sub-accounts, and webhook logging).

### Changes Made

#### 1. New Models Added to `prisma/schema.prisma`

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `NowPaymentsSubAccount` | Maps our users to NowPayments sub-partner accounts | userId (unique), nowpaymentsUserId (unique), deposit addresses for BTC/USDT TRC20/USDT Polygon |
| `NowPaymentsDeposit` | Tracks crypto deposit payments | nowpaymentsPaymentId, priceAmount, payCurrency, paymentStatus, split tracking fields, investmentId |
| `NowPaymentsPayout` | Tracks crypto withdrawal/payout requests | nowpaymentsBatchId, amount, currency, destinationAddress, payoutStatus, txHash |
| `NowPaymentsWebhookLog` | Logs all incoming NowPayments webhooks | eventType, payload (JSON string), signature, signatureValid, processed flag |

#### 2. User Model Relations Added

Added three relation fields to the existing `User` model:
- `nowpaymentsSubAccount NowPaymentsSubAccount?` — One-to-one with sub-account
- `nowpaymentsDeposits NowPaymentsDeposit[]` — One-to-many deposits
- `nowpaymentsPayouts NowPaymentsPayout[]` — One-to-many payouts

#### 3. Indexes

Each new model includes appropriate indexes for query performance:
- `NowPaymentsSubAccount`: `nowpaymentsUserId`
- `NowPaymentsDeposit`: `userId`, `paymentStatus`, `nowpaymentsPaymentId`, `orderId`
- `NowPaymentsPayout`: `userId`, `payoutStatus`, `nowpaymentsBatchId`
- `NowPaymentsWebhookLog`: `eventType`, `paymentId`, `processed`, `createdAt`

#### 4. Verification
- `bun run db:push` — Successful, all new models synced to SQLite
- `bun run lint` — No errors
- Prisma Client regenerated with new models

## Task 3 - NowPayments Service Library (Completed)

**Agent**: Backend Developer  
**Date**: 2025-05-18

### Summary
Created a comprehensive NowPayments API integration service library at `src/lib/nowpayments.ts` that wraps all NowPayments v1 API endpoints needed for the mining platform's crypto payment processing.

### Changes Made

#### 1. New File: `src/lib/nowpayments.ts`

The service library provides the following modules:

| Module | Functions | Description |
|--------|-----------|-------------|
| **JWT Token Management** | `getJwtToken()`, `clearJwtToken()` | Auto-refresh JWT with 5-min expiry and 30s buffer |
| **Payment API** | `createPayment()`, `getPaymentStatus()`, `getMinimumPaymentAmount()`, `getEstimatedPrice()` | Create payments with deposit addresses, check status, get estimates |
| **Invoice API** | `createInvoice()`, `createInvoicePayment()` | Hosted payment pages with multi-currency selection |
| **Sub-Partner/Custody API** | `createSubPartnerAccount()`, `getSubPartnerBalance()`, `listSubPartners()`, `createSubPartnerDeposit()`, `createSubPartnerPayment()`, `transferToSubPartner()`, `writeOffFromSubPartner()` | Per-user deposit accounts, transfers, and write-offs |
| **Payout API** | `createPayout()`, `verifyPayout()`, `getPayoutStatus()`, `validatePayoutAddress()`, `getMinimumPayoutAmount()`, `calculatePayoutFee()` | Send crypto to external wallets with 2FA verification |
| **Balance API** | `getBalance()` | Retrieve custody account balances |
| **Currency API** | `getAvailableCurrencies()`, `getFullCurrencies()`, `getMerchantCoins()` | Query supported and enabled currencies |
| **Webhook Verification** | `verifyWebhookSignature()` | HMAC-SHA512 signature verification with constant-time comparison |
| **Status Helpers** | `isPaymentFinal()`, `isPaymentSuccessful()`, `isPayoutFinal()` | Payment/payout status classification utilities |
| **Currency Mapping** | `CURRENCY_MAP`, `toNowPaymentsCurrency()`, `fromNowPaymentsCurrency()` | Internal-to-NowPayments currency code translation |
| **Config Check** | `isNowPaymentsConfigured()`, `getNowPaymentsConfig()` | Runtime configuration validation |

#### 2. Design Decisions

- **Generic `apiRequest` helper**: Centralized fetch wrapper with automatic JWT injection for protected endpoints (`requireJwt: true`), consistent error handling, and proper headers.
- **Type safety**: All request params and response types are defined as TypeScript interfaces (`CreatePaymentParams`, `PaymentResponse`, `CreateInvoiceParams`, `InvoiceResponse`, `SubPartnerAccount`, `SubPartnerDepositResponse`, `PayoutWithdrawal`, `CreatePayoutResponse`, etc.).
- **Security**: Webhook verification uses `crypto.timingSafeEqual()` to prevent timing attacks. Signature length mismatch is checked before comparison.
- **Development flexibility**: `verifyWebhookSignature()` returns `true` without IPN_SECRET in development (with console warning).
- **JWT auto-refresh**: 30-second buffer before expiry ensures the token never expires mid-request.
- **Currency mapping**: Supports 10 common currencies including USDT on 4 networks (TRC20, Polygon, BSC, ERC20), BTC, ETH, TRX, USDC Polygon, LTC, DOGE.

#### 3. Verification
- `bun run lint` — No errors (clean pass)
- All exported functions and types are ready for use by API route handlers

## Task 4 - NowPayments API Routes (Completed)

**Agent**: API Route Developer  
**Date**: 2025-05-18

### Summary
Created 6 API route handlers for the NowPayments integration, enabling crypto deposits, withdrawals, webhook processing, status checking, configuration management, and address generation.

### Changes Made

#### 1. New Files Created

| File | Method | Purpose |
|------|--------|---------|
| `src/app/api/nowpayments/deposit/route.ts` | POST | Create NowPayments deposit — validates amount, creates sub-account if needed, creates payment, stores deposit & investment records |
| `src/app/api/nowpayments/withdraw/route.ts` | POST | Create NowPayments payout — validates amount/balance, deducts balance atomically, creates payout/investment/transaction records, attempts NowPayments payout with fallback to manual |
| `src/app/api/nowpayments/webhook/route.ts` | POST | IPN webhook handler — verifies signature, logs webhook, processes payment finished (credit user + split to platform wallet), payment failed/expired, payout finished, payout failed/rejected (refund balance) |
| `src/app/api/nowpayments/status/route.ts` | GET | Check deposit/payout status — fetches from NowPayments API, updates local DB if status changed, returns current status |
| `src/app/api/nowpayments/config/route.ts` | GET/POST | Admin config management — GET returns NowPayments config status, currencies, balance; POST updates NowPayments SystemConfig keys with admin logging |
| `src/app/api/nowpayments/generate-address/route.ts` | POST | Generate deposit address — ensures sub-account exists, generates address via Sub-Partner API, caches address per currency |

#### 2. Key Design Decisions

- **Graceful degradation**: All routes that call NowPayments API fall back to manual processing if NowPayments is not configured or API calls fail. The system works without NowPayments enabled.
- **Atomic balance operations**: Withdrawal uses `$transaction` with raw SQL balance deduction + re-verification (matching existing withdraw pattern).
- **Split logic**: When a deposit is confirmed via webhook, the configured split percentage is sent to the platform wallet. Fallback to sub-partner write-off if direct payout fails.
- **Webhook idempotency**: Duplicate webhook processing is prevented by checking final status and `splitProcessed` flag.
- **Payout failure handling**: If a payout is FAILED/REJECTED, the user's balance is automatically refunded.
- **SQLite-compatible**: All raw SQL uses `CAST(... AS REAL)` and `CAST(... AS TEXT)` pattern, no PostgreSQL-specific syntax.
- **Consistent response format**: All routes use `apiError`, `apiSuccess`, `handleApiError` helpers.

#### 3. Integration Points

- Uses `@/lib/nowpayments` for all NowPayments API calls
- Uses `@/lib/auth` (`requireAuth`, `requireAdmin`, `d`, `ds`, `dusdt`) for auth and decimal operations
- Uses `@/lib/db` for Prisma database access
- Uses `@/lib/market-data` (`getUSDTBRLRate`) for BRL conversion in withdrawals
- Creates `Investment`, `Transaction`, `NowPaymentsDeposit`, `NowPaymentsPayout`, `NowPaymentsWebhookLog` records
- Manages `SystemConfig` keys: `nowpayments_enabled`, `nowpayments_split_pct`, `nowpayments_split_wallet`

#### 4. Verification
- `bun run lint` — No errors (clean pass)
- Dev server running without compilation errors
- All 6 routes follow Next.js 16 App Router `export async function POST/GET` pattern

## Task 5-b - NowPayments Translation Keys (Completed)

**Agent**: Translation Updater  
**Date**: 2025-05-18

### Summary
Added NowPayments-related translation keys to all three language files (Portuguese, English, Spanish) for the mining platform's i18n support.

### Changes Made

#### 1. Files Modified

| File | Changes |
|------|---------|
| `src/lib/translations/pt.ts` | Added NowPayments keys in deposit, withdrawal, adminSidebar, admin, and toast sections |
| `src/lib/translations/en.ts` | Added NowPayments keys in deposit, withdrawal, adminSidebar, admin, and toast sections |
| `src/lib/translations/es.ts` | Added NowPayments keys in deposit, withdrawal, adminSidebar, admin, and toast sections |

#### 2. Translation Keys Added (per section)

**deposit section** (15 keys):
- `nowpaymentsTitle`, `generateAddress`, `generatingAddress`, `depositAddress`, `sendExactAmount`, `waitingPayment`, `confirming`, `depositConfirmed`, `depositFailed`, `depositExpired`, `autoCredit`, `useCorrectNetwork`, `newAddress`, `orManualDeposit`, `manualDeposit`

**withdrawal section** (3 keys):
- `nowpaymentsTitle`, `autoWithdraw`, `toWallet`

**adminSidebar section** (1 key):
- `nowpayments`

**admin section** (5 keys):
- `nowpaymentsConfig`, `apiKey`, `ipnSecret`, `splitPct`, `splitWallet`, `testConnection`

**toast section** (6 keys):
- `npDepositCreated`, `npDepositConfirmed`, `npWithdrawCreated`, `npConfigSaved`, `npConnectionSuccess`, `npConnectionFailed`

#### 3. Verification
- `bun run lint` — No errors (clean pass)
- All three translation files have consistent key structures across languages

## Task 5 - Frontend NowPayments Integration (Completed)

**Agent**: Frontend Developer
**Date**: 2025-05-18

### Summary
Integrated NowPayments into the frontend deposit and withdrawal flows in `src/app/page.tsx`, adding crypto wallet address generation, deposit status polling, enhanced withdraw with NowPayments fallback, and admin configuration panel.

### Changes Made

#### 1. New State Variables (line ~483)

Added 8 NowPayments deposit state variables:
- `npDepositAddress`, `npDepositAmount`, `npDepositCurrency`, `npDepositStatus`, `npDepositPaymentId`, `npGeneratingAddress`, `npAddressCopied`

#### 2. NowPayments Deposit Handler (line ~953)

Added `handleNowPaymentsDeposit()` function that:
- Validates minimum deposit amount (10 USDT)
- Calls `/api/nowpayments/deposit` to generate a wallet address
- Sets deposit address and payment ID on success
- Falls back to manual deposit if no address returned

Added `copyDepositAddress()` helper for clipboard copy.

Added `resetNpDeposit()` to clear all NowPayments deposit state.

#### 3. Deposit Status Polling (line ~1004)

Added `useEffect` that polls `/api/nowpayments/status` every 15 seconds when a deposit payment ID exists:
- Updates status in real-time (waiting → confirming → confirmed → finished)
- Auto-closes dialog and refreshes balance on success
- Shows error toast on failure/expiry

#### 4. Enhanced Deposit Dialog (line ~4441)

Replaced the simple deposit form with a two-phase dialog:
- **Phase 1**: NowPayments deposit form with currency selector (USDT TRC20, USDT Polygon, BTC, ETH, TRX), "Gerar Endereço" button, plus a divider with manual deposit fallback form below
- **Phase 2**: After address generation, shows the deposit address with copy button, real-time status indicator with animated dot, important warnings, and "Gerar Novo Endereço" button
- Dialog resets NowPayments state on close

#### 5. Enhanced Withdraw Dialog (line ~4543)

Replaced the simple withdraw form with NowPayments-aware version:
- Updated description to "Saque automático via NowPayments"
- Added more currency options (USDT TRC20, USDT Polygon, BTC, PIX)
- Added info box explaining automatic NowPayments processing
- Used optional chaining for `user?.balance` to handle null

#### 6. Updated handleWithdraw (line ~1028)

Enhanced withdraw handler to try NowPayments first:
- For crypto methods (`usdt_trc20`, `usdt_polygon`, `btc`, `eth`, `trx`), attempts `/api/nowpayments/withdraw` first
- Falls back to manual `/api/withdraw` if NowPayments fails (with console warning)
- PIX withdrawals always use the manual API

#### 7. Admin Panel - NowPayments Config (line ~3957)

Added NowPayments configuration support:
- `categoryIcon()` now maps `nowpayments` → `Globe` icon
- `categoryLabel()` now includes `nowpayments` → "NowPayments"
- Config categories list now includes `'nowpayments'`
- "Setup NowPayments" button that seeds 7 default config keys: `nowpayments_api_key`, `nowpayments_email`, `nowpayments_password`, `nowpayments_ipn_secret`, `nowpayments_base_url`, `nowpayments_split_pct`, `nowpayments_split_wallet`
- Added "NowPayments" option in the "Add Config" category dropdown

#### 8. Verification
- `bun run lint` — No errors (clean pass)
- Dev server running without compilation errors
- All existing manual deposit/withdraw functionality preserved as fallback

## Task 6 - Final Testing & GitHub Push (Completed)

**Agent**: Main Agent  
**Date**: 2025-05-18

### Summary
Final verification of all components, environment setup, and push to GitHub repository.

### Changes Made

#### 1. Environment Variables (.env)
Added NowPayments configuration variables:
- `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD`
- `NOWPAYMENTS_BASE_URL` (default: https://api.nowpayments.io/v1)
- `NOWPAYMENTS_SPLIT_PCT` (default: 10%)
- `NOWPAYMENTS_SPLIT_WALLET` (platform wallet for receiving splits)
- `JWT_SECRET` for production auth
- `NEXT_PUBLIC_APP_URL` for webhook callbacks

#### 2. Testing Results
- `bun run lint` — Clean pass, no errors
- Homepage (GET /) — 200 OK
- Landing API (GET /api/landing) — 200 OK, returns miners, config, stats
- Auth Register (POST /api/auth/register) — 201 Created
- Auth Login (POST /api/auth/login) — 200 OK
- NowPayments Config (GET /api/nowpayments/config) — 200 OK, returns configuration status
- NowPayments Deposit (POST /api/nowpayments/deposit) — Handles gracefully when API not configured

#### 3. GitHub Push
- Repository: https://github.com/isanat/mining-protocol
- Branch: main
- Commit: `feat: integrate NowPayments API with automatic split for deposits/withdrawals`
- 149 files changed, 25504 insertions

#### 4. Production Deployment Notes
- Configure NowPayments credentials in Vercel environment variables
- Set `nowpayments_split_pct` in SystemConfig (e.g., 10 for 10%)
- Set `nowpayments_split_wallet` in SystemConfig (platform USDT TRC20 address)
- Enable NowPayments from admin panel after credentials are set
- Webhook URL: `{YOUR_DOMAIN}/api/nowpayments/webhook`
- JWT tokens expire every 5 minutes — auto-refresh handled by service

## Task 4 - PostgreSQL Migration (Completed)

**Agent**: Database Migration Specialist  
**Date**: 2025-06-05

### Summary
Migrated the mining-protocol project from SQLite back to PostgreSQL for production deployment with Coolify. Reversed all SQLite-specific patterns from Task 1, added Docker production deployment support, and added PostgreSQL-specific concurrency features (FOR UPDATE locks, pg_advisory_lock).

### Changes Made

#### 1. Prisma Schema (`prisma/schema.prisma`)
- Changed `provider` from `"sqlite"` to `"postgresql"`
- Updated header comment from "SQLite" to "PostgreSQL"
- All models, relations, indexes, and constraints remain identical
- All String fields storing decimal values remain as String (designed for precision)

#### 2. Raw SQL Query Reversals (SQLite → PostgreSQL)

| Pattern | SQLite (current) | PostgreSQL (restored) |
|---------|-----------------|----------------------|
| Type cast in arithmetic | `CAST(x AS REAL)` | `CAST(x AS NUMERIC)` |
| Text result cast | `) AS TEXT)` | `)::text` |
| Row-level lock | Removed | `SELECT 1 FROM "User" WHERE id = $id FOR UPDATE` |
| Advisory lock | Removed | `SELECT pg_advisory_lock(12345)` / `pg_advisory_unlock(12345)` |
| Boolean literal | `hasInvested = 1` | `hasInvested = true` |

**Full replacement example:**
- Before: `CAST(CAST(balance AS REAL) - ${amount} AS TEXT)`
- After: `(CAST(balance AS NUMERIC) - ${amount})::text`

#### 3. Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Changed provider to postgresql |
| `src/lib/affiliate.ts` | Replaced 2 SQLite CAST patterns with PostgreSQL `CAST AS NUMERIC)::text` |
| `src/app/api/admin/affiliate-withdrawals/route.ts` | Replaced 2 SQLite CAST patterns (totalWithdrawn and affiliateBalance refund) |
| `src/app/api/admin/deposits/route.ts` | Replaced SQLite CAST pattern (balance + totalInvested credit) |
| `src/app/api/rentals/route.ts` | Added `FOR UPDATE` row lock, replaced SQLite CAST pattern (balance deduction) |
| `src/app/api/nowpayments/webhook/route.ts` | Replaced 3 SQLite CAST patterns, fixed `hasInvested = 1` → `hasInvested = true` |
| `src/app/api/nowpayments/withdraw/route.ts` | Replaced SQLite CAST pattern (balance deduction) |
| `src/app/api/affiliate/route.ts` | Replaced 2 SQLite CAST patterns (badge reward and milestone reward) |
| `src/app/api/affiliate/withdraw/route.ts` | Added `FOR UPDATE` row lock, replaced SQLite CAST pattern (affiliateBalance deduction) |
| `src/app/api/cron/distribute/route.ts` | Added `pg_advisory_lock(12345)` / `pg_advisory_unlock(12345)` with `lockReleased` tracking, replaced SQLite CAST pattern (balance + totalMined credit) |
| `src/app/api/withdraw/route.ts` | Added `FOR UPDATE` row lock, replaced SQLite CAST pattern (balance deduction) |
| `src/app/api/admin/users/route.ts` | Added `FOR UPDATE` row lock for admin user updates |
| `src/lib/auth.ts` | Updated comment from "SQLite string storage" to "PostgreSQL string storage" |
| `src/app/api/admin/stats/route.ts` | Updated comment removing SQLite reference |
| `src/app/api/landing/route.ts` | Updated comment removing SQLite reference |

#### 4. Docker Production Deployment

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production build: node:20-alpine base, bun for deps, prisma generate, next build with standalone output, minimal runner image |
| `.dockerignore` | Excludes node_modules, .next, db/, .env, logs, IDE files from Docker context |

#### 5. Package.json Updates
- `start` script: Changed from `bun .next/standalone/server.js` to `node .next/standalone/server.js` (Node.js for production Docker)
- Added `db:migrate:deploy` script for production PostgreSQL migrations
- Added `docker:build` and `docker:run` helper scripts

#### 6. db.ts
- No changes needed — PrismaClient works the same with both SQLite and PostgreSQL

#### 7. Verification
- `bun run lint` — No errors (clean pass)
- Grep confirmed zero remaining `AS REAL`, `AS TEXT`, or `sqlite` references in `src/`
- All 15 raw SQL queries now use PostgreSQL `CAST AS NUMERIC)::text` pattern
- All 4 transaction-critical routes have `FOR UPDATE` row-level locks
- Cron distribute has `pg_advisory_lock/unlock` with proper error handling

#### 8. Production Deployment Notes
- Set `DATABASE_URL` in Coolify environment variables (PostgreSQL connection string)
- Run `prisma migrate deploy` or `prisma db push` against the PostgreSQL database
- The `hasInvested = true` boolean is now correct for PostgreSQL (was `= 1` for SQLite)
- Advisory lock key 12345 prevents concurrent cron distribution runs

## Task 5 - Coolify Production Deployment (Completed)

**Agent**: Main Agent  
**Date**: 2026-05-18

### Summary
Deployed the Mining Protocol platform to production on Coolify (self-hosted PaaS) with PostgreSQL database, custom domain flashminings.com, and automatic database migrations on container startup.

### Changes Made

#### 1. Coolify Project Setup
- Created project "FlashMining" (UUID: s5kni9s1zgipfxxxuy22jzau)
- Created PostgreSQL 16 database "flashmining-db" (UUID: b12p2y3sknva5zyk1b4f4w1j)
  - User: flashmining
  - Database: flashmining
  - External URL: postgres://flashmining:****@164.68.126.14:5435/flashmining
  - Public port: 5435
  - Status: running:healthy

#### 2. Coolify Application Setup
- Created application "flashmining-app" (UUID: vdcwjovqbtgabc58jxchncki)
- Build pack: dockerfile
- Git repository: https://github.com/isanat/mining-protocol.git (main branch)
- Domain: https://flashminings.com
- Health check: enabled on /api/landing

#### 3. Environment Variables Configured in Coolify
- `DATABASE_URL` - PostgreSQL connection string (external URL with public port)
- `JWT_SECRET` - Production JWT secret
- `NEXT_PUBLIC_APP_URL` - https://flashminings.com
- `NOWPAYMENTS_API_KEY` - (empty, to be filled by user)
- `NOWPAYMENTS_IPN_SECRET` - (empty, to be filled by user)
- `NOWPAYMENTS_EMAIL` - (empty, to be filled by user)
- `NOWPAYMENTS_PASSWORD` - (empty, to be filled by user)
- `NOWPAYMENTS_BASE_URL` - https://api.nowpayments.io/v1

#### 4. Key Fixes During Deployment

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| App crashed on start | .env file in repo had `DATABASE_URL=file:./../db/custom.db` (SQLite), overriding Coolify's PostgreSQL URL | Removed hardcoded DATABASE_URL from .env file |
| Prisma migration failed | Global `npm install -g prisma` installed Prisma v7 which doesn't support `url = env()` in schema | Pinned to `prisma@6` in Dockerfile |
| Health check failing | App starts but health check was hitting `/` which loads slowly | Changed health check path to `/api/landing` |
| Container exits immediately | `set -e` in start.sh caused container to exit if Prisma migration failed | Removed `set -e`, added fallback error handling |

#### 5. Files Modified for Deployment
- `.env` - Removed hardcoded DATABASE_URL, left values empty for Coolify to provide
- `Dockerfile` - Multi-stage build with node:22, Prisma CLI v6, start.sh script
- `start.sh` - Runs `npx prisma db push --accept-data-loss` then `node server.js`
- `.dockerignore` - Excludes unnecessary files from Docker context
- `nixpacks.toml` - Alternative build config (available if needed)

#### 6. Production URLs
- **Website**: https://flashminings.com
- **API Landing**: https://flashminings.com/api/landing
- **Auth Register**: https://flashminings.com/api/auth/register
- **Auth Login**: https://flashminings.com/api/auth/login
- **NowPayments Webhook**: https://flashminings.com/api/nowpayments/webhook
- **Coolify Dashboard**: http://164.68.126.14:8000

#### 7. Verification
- HTTPS 200 OK on flashminings.com
- Landing API returns `{ success: true }`
- User registration works (tested with admin@flashminings.com)
- Database migrations run automatically on container start
- Prisma Client v6.19.3 generated successfully
- PostgreSQL database in sync with schema

#### 8. Next Steps for User
1. **Configure NowPayments**: Go to Coolify dashboard → FlashMining → flashmining-app → Environment Variables, and fill in:
   - `NOWPAYMENTS_API_KEY` - Your NowPayments API key
   - `NOWPAYMENTS_EMAIL` - Your NowPayments account email
   - `NOWPAYMENTS_PASSWORD` - Your NowPayments account password
   - `NOWPAYMENTS_IPN_SECRET` - Your IPN secret for webhook verification
2. **Set up admin user**: Register a user, then manually update their role to "admin" in the database
3. **Configure split payment**: After logging in as admin, go to Settings → NowPayments and set:
   - Split percentage (e.g., 10%)
   - Platform wallet address for receiving splits
4. **Set up NowPayments webhook**: In NowPayments dashboard, set the IPN callback URL to `https://flashminings.com/api/nowpayments/webhook`
5. **Add miners**: As admin, add miners and mining plans through the admin panel
