---
Task ID: 2
Agent: Main Agent
Task: Compare and improve admin config UI to match mining-protocol repo quality

Work Log:
- Browsed mining-protocol repo to analyze its admin config UI pattern
- Found the key difference: mining-protocol uses CONFIG_LABELS constant with label, description, type, unit, options for each config key
- Our project was showing raw key names like "has_pix", "manual_deposit_enabled" — very ugly
- Added CONFIG_LABELS constant with 30+ config keys covering all categories (general, deposit, withdrawal, trading, affiliate, nowpayments)
- Added HIDDEN_CONFIG_KEYS set to hide keys managed via dedicated UI (splits, logo, favicon)
- Added categoryDescription for each category with descriptive text
- Rewrote admin config section with 2-column grid layout
- Each config field now shows: friendly label from CONFIG_LABELS, description, and proper input type
- Boolean configs: Switch with "Ativado"/"Desativado" labels and emerald/zinc coloring
- Number configs: Input with unit suffix overlay (USDT, %, horas)
- Secret configs: Password input with Lock icon + Eye/EyeOff toggle button
- Select configs: Dropdown select for enum values (affiliate_commission_mode)
- Modified fields get amber ring highlight + "modificado" badge + revert button
- Category icons now use emerald-400 color (matching mining-protocol pattern)
- Category descriptions shown below the title

Stage Summary:
- Admin config UI now matches mining-protocol quality with CONFIG_LABELS pattern
- All config keys have friendly Portuguese labels and descriptions
- 5 field types supported: boolean (Switch), number (with unit), string (Input), secret (password with eye toggle), select (dropdown)
- 2-column grid layout on desktop, single column on mobile
- Visual feedback: amber ring on modified fields, emerald/zinc status labels
- HIDDEN_CONFIG_KEYS hides internal keys from the UI
---
Task ID: 1
Agent: Main Agent
Task: Complete payment methods audit and admin config overhaul

Work Log:
- Analyzed 3 screenshots from mining-protocol admin config panel (Marca do Site, Depósito/Saques, Afiliado/NowPayments)
- Fixed copy-traders API 405 errors by adding PUT (update) and DELETE handlers to route
- Added missing config keys to setup route: withdrawal_interval_hours, usdt_brl_rate, site_logo, site_favicon, nowpayments credentials
- Updated migrate-config route with comprehensive list of missing config keys
- Added 'branding' category to admin config validation schema along with 'secret' type
- Added CONFIG_LABELS entries for: site_logo, site_favicon, usdt_brl_rate, withdrawal_interval_hours
- Added branding category with Image icon and description
- Reorganized admin config section order: branding > general > deposit > withdrawal > trading > affiliate > nowpayments
- Added branding section with logo/favicon preview in admin UI
- Added NowPayments connection test button with test-connection API endpoint
- Added withdrawal method toggles (manual_withdrawal_enabled, nowpayments_withdrawal_enabled) enforcement
- Added withdrawal interval check (configurable minimum hours between withdrawals)
- Ensured affiliate withdrawal API also respects manual_withdrawal_enabled toggle
- Updated site config API with new fields (siteLogo, siteFavicon, usdtBrlRate, maintenanceMode, withdrawalIntervalHours)
- Updated landing config API with branding and exchange rate fields
- Removed site_logo/site_favicon from HIDDEN_CONFIG_KEYS (now visible in branding section)
- Replaced hardcoded "Setup NowPayments" button with generic "Migrar Configs" button
- Pushed commit to GitHub

Stage Summary:
- Copy-traders API: PUT and DELETE now work (was 405 before)
- Admin config now has 7 organized sections matching mining-protocol pattern
- All payment methods have proper enable/disable toggles (deposit: PIX, USDT, Manual, NowPayments; withdrawal: Manual, NowPayments)
- Withdrawal interval feature added (configurable hours between withdrawals)
- Logo/favicon URL fields with preview in branding section
- NowPayments connection test button added
- All changes pushed to GitHub (commit f74e162)
---
Task ID: 2-b
Agent: Explore Agent
Task: Audit all User API routes

Work Log:
- Listed all 36 route.ts files under src/app/api/ (excluding 17 admin/ routes)
- Read and analyzed every user-facing route file in full
- Read src/lib/auth.ts, src/lib/validations.ts, src/lib/api-utils.ts, src/lib/affiliate.ts
- Identified TWO competing requireAuth() implementations (auth.ts vs api-utils.ts)
- Found critical bug in voucher/progress: deducts from teamBonusPct instead of voucherBalance on expiry
- Found NowPayments withdraw route missing admin toggle, interval check, and voucher lock check
- Found NowPayments status endpoint missing user ownership verification
- Found multiple routes missing zod validation (nowpayments/deposit, nowpayments/withdraw, change-password, affiliate POST)
- Found nowpayments/generate-address missing nowpayments_enabled config check
- Found nowpayments/withdraw missing SELECT FOR UPDATE row lock (race condition)
- Compiled full audit report with 19 issues across Critical/High/Medium/Low priority

---
Task ID: 2-a
Agent: Explore Agent
Task: Audit all Admin API routes for bugs, missing endpoints, broken validation, and inconsistencies

Work Log:
- Listed all 23 admin route files under src/app/api/admin/*/
- Read and analyzed every admin route file in full
- Read supporting files: auth.ts, api-utils.ts, validations.ts, prisma/schema.prisma, middleware.ts
- Read non-admin routes with admin relevance: affiliate/withdraw, withdraw, deposit, deposits
- Identified 2 different requireAdmin implementations causing inconsistent auth
- Found critical model mismatch: user deposit/withdraw APIs use Investment model but admin APIs use Deposit model
- Found Prisma schema missing fields that code expects on Investment model
- Found broken apiSuccess() calls passing string instead of status number
- Found arbitrary shell command execution endpoint
- Found multiple routes missing Zod validation
- Found English error messages in Portuguese-error-codebase
- Found missing CRUD handlers (trading-pools PUT/DELETE)
- Found affiliate-badge PUT allows arbitrary field injection
- Compiled comprehensive audit report with 30+ issues across all priority levels

Stage Summary:
- Full audit of 23 admin API routes + 4 non-admin routes + Prisma schema completed
- 5 Critical issues, 9 High issues, 10 Medium issues, 6 Low issues identified
- No files modified (read-only audit)
---
Task ID: 2-c
Agent: Explore Agent
Task: Audit frontend components for bugs, broken UI flows, missing features, and inconsistencies

Work Log:
- Read src/app/page.tsx (8750 lines) in sections covering: types, state, handlers, all user tabs, all admin tabs, all dialogs
- Read supporting files: src/lib/i18n.tsx, src/lib/translations.ts, src/lib/api-utils.ts, src/lib/auth.ts, src/lib/market-data.ts, src/lib/nowpayments.ts, src/lib/affiliate.ts, src/lib/utils.ts, src/lib/validations.ts
- Audited login/register forms, dashboard, deposit/withdrawal/investment flows, affiliate page, faturas/saques/extrato tabs
- Audited all admin tabs: overview, copyTraders, plans, users, deposits, withdrawals, nowpayments, affiliates, affiliateWithdrawals, affiliateRanks, affiliateMilestones, affiliateContests, affiliateBadges, vouchers, config, marketing, logs
- Checked i18n coverage for PT-BR/ES/EN/ZH
- Checked API method correctness, form validation, loading states, error handling
- Identified 22 issues across Critical/High/Medium/Low priority

Stage Summary:
- Full frontend audit of 8750-line page.tsx + 8 supporting files completed
- 3 Critical issues, 6 High issues, 8 Medium issues, 5 Low issues identified
- No files modified (read-only audit)
---
Task ID: 2-b
Agent: Fix Agent
Task: Fix investments route field name mismatch (rankBonusPct → teamBonusPct)

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents
- Read /home/z/my-project/src/app/api/investments/route.ts to identify the two buggy lines
- Line 145 (voucher flow): Changed `rankBonusPct: ds(rankBonusPct),` → `teamBonusPct: ds(rankBonusPct),`
- Line 207 (regular balance flow): Changed `rankBonusPct: ds(rankBonusPct),` → `teamBonusPct: ds(rankBonusPct),`
- Verified no remaining `rankBonusPct:` field assignments in the file (grep returned empty)
- Verified both `teamBonusPct:` assignments are now on lines 145 and 207
- The local JS variable `rankBonusPct` was intentionally left unchanged — only the Prisma field name was corrected

Stage Summary:
- Fixed critical field name mismatch that would cause Prisma create calls to fail at runtime
- Investment.create in both voucher and regular balance flows now correctly use `teamBonusPct` matching the Prisma schema
---
Task ID: 2-a
Agent: Fix Agent
Task: Fix deposit/withdraw model mismatch (Investment → Deposit)

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents
- Read /home/z/my-project/prisma/schema.prisma to verify Deposit and Investment model fields
- Confirmed the critical bug: both deposit and withdraw API routes were using `db.investment` / `tx.investment` with fields (type, method, network, txHash, brlAmount, usdtRate, destination, description, adminNotes) that only exist on the Deposit model, not the Investment model

**Fix 1: `/home/z/my-project/src/app/api/deposit/route.ts`**
- Line 56: Changed `db.investment.findUnique({ where: { txHash: data.txHash } })` → `db.deposit.findUnique({ where: { txHash: data.txHash } })`
- Line 63: Changed `db.investment.create({` → `db.deposit.create({`
- All data fields (type, method, network, txHash, brlAmount, usdtRate, description) are valid on the Deposit model

**Fix 2: `/home/z/my-project/src/app/api/withdraw/route.ts`**
- Line 52: Changed `db.investment.findFirst(...)` → `db.deposit.findFirst(...)` for withdrawal interval check
- Line 139: Changed `tx.investment.create(...)` → `tx.deposit.create(...)` for withdrawal record creation
- Renamed local variable from `investment` to `deposit` to match the model
- Line 165: Changed `referenceId: investment.id` → `referenceId: deposit.id`
- Line 166: Changed `referenceType: 'Investment'` → `referenceType: 'Deposit'`
- Line 170: Changed `return { investment, fee, netAmount }` → `return { deposit, fee, netAmount }`
- Line 174: Changed `withdrawal: result.investment` → `withdrawal: result.deposit`

- Ran `bun run lint` — passes with no errors
- Verified all business logic, validation, and error handling preserved unchanged

Stage Summary:
- Fixed critical Prisma model mismatch that would cause runtime errors on deposit and withdrawal creation
- Deposit route now correctly uses `db.deposit` instead of `db.investment`
- Withdraw route now correctly uses `db.deposit` instead of `db.investment` / `tx.investment`
- Transaction referenceType updated from 'Investment' to 'Deposit' for consistency
- No schema changes needed — the Deposit model already had all required fields
---
Task ID: 2-c
Agent: Fix Agent
Task: Fix multiple API route bugs (double requireAuth, missing handlers, field injection)

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents
- Read all 3 target files before making changes

**Fix 1: `/home/z/my-project/src/app/api/nowpayments/status/route.ts`**
- Removed duplicate `await requireAuth();` on line 15, keeping only `const session = await requireAuth();` which stores the result
- Double call was redundant and wasteful (two JWT verifications per request)

**Fix 2: `/home/z/my-project/src/app/api/admin/trading-pools/route.ts`**
- Changed import: `requireAdmin` now imported from `@/lib/auth` instead of `@/lib/api-utils` (consistent with other admin routes; auth.ts version throws on failure instead of returning null)
- Updated GET handler: replaced `const adminId = await requireAdmin(request); if (!adminId) return apiError(...)` with `await requireAdmin();` (throws on failure)
- Updated POST handler: same auth change as GET
- Added PUT handler: update trading pool by ID with explicit field mapping (name, totalAum, dailyVolume, strategy, status) + admin log entry
- Added DELETE handler: soft delete by setting status to 'inactive' + admin log entry
- Both new handlers use `session = await requireAdmin()` to get userId for admin log

**Fix 3: `/home/z/my-project/src/app/api/admin/affiliate-badges/route.ts`**
- Replaced `data: updates` (arbitrary field injection vulnerability) with explicit field mapping
- Added allowlist of 11 fields: name, description, icon, color, category, requirement, rewardType, rewardValue, isAuto, sortOrder, isActive
- Each field is only included in the update data if explicitly provided (not undefined)
- This prevents malicious clients from injecting arbitrary Prisma fields

- Ran `bun run lint` — passes with no errors

Stage Summary:
- Fixed 3 API route bugs identified in the 2-a and 2-b audits
- nowpayments/status: removed duplicate requireAuth call
- trading-pools: fixed auth import, added PUT/DELETE handlers with admin logging
- affiliate-badges: closed arbitrary field injection vulnerability in PUT handler
---
Task ID: 3
Agent: Fix Agent
Task: Fix affiliate ranks default names + audit frontend

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents
- Read all target files before making changes

**Fix 1: `/home/z/my-project/src/app/api/admin/affiliate-ranks/route.ts`**
- Replaced DEFAULT_RANKS array: English names → Portuguese names
  - "Silver" → "Prata", "Gold" → "Ouro"
  - Removed Platinum and Diamond (not in documented 3-rank system)
- Updated commissionBoost values to match documented business logic:
  - Bronze: '0' → '1' (Team Bonus +1% ROI diário)
  - Prata: '0.5' → '2' (Team Bonus +2% ROI diário)
  - Ouro: '1' → '3' (Team Bonus +3% ROI diário)
- Updated perks to include Team Bonus descriptions in Portuguese

**Fix 2: `/home/z/my-project/src/lib/affiliate.ts`**
- Replaced hardcoded getTeamBonusPct thresholds (10/20/30 referrals) with dynamic AffiliateRank table query
- Function now reads ranks from DB with `orderBy: { minReferrals: 'desc' }` and matches against actual rank thresholds (1/5/15)
- This ensures consistency: if admin changes rank thresholds, getTeamBonusPct automatically reflects the change

**Fix 3: `/home/z/my-project/src/app/page.tsx`** — Withdrawal dialog missing method/destination for manual-only mode
- CRITICAL BUG: When `manualWithdrawalEnabled` was true but `nowpaymentsWithdrawalEnabled` was false, the withdrawal dialog only showed a static info box with NO method selector or destination input. The `handleWithdraw` function read `form.method` and `form.destination` which didn't exist in the form, causing undefined values that would fail backend validation.
- Added method selector (PIX, USDT TRC20, USDT Polygon) and destination input for manual-only withdrawal mode, mirroring the deposit dialog's manual method pattern.
- Replaced the static info-only `<div>` with an IIFE that builds manual method options from siteConfig flags.

**Fix 4: `/home/z/my-project/src/lib/validations.ts`** — Withdrawal schema too restrictive
- `withdrawalSchema` only allowed method values `['pix', 'usdt_trc20']`, but the frontend and backend now support `usdt_polygon` as well.
- Updated both `withdrawalSchema` and `affiliateWithdrawalSchema` to accept `['pix', 'usdt_trc20', 'usdt_polygon']`.

**Fix 5: `/home/z/my-project/src/app/api/withdraw/route.ts`** — Network mapping for usdt_polygon
- Line 147: Added `data.method === 'usdt_polygon' ? 'Polygon' : null` to the network field mapping so Polygon withdrawals are properly tagged.

**Fix 6: `/home/z/my-project/src/app/api/affiliate/withdraw/route.ts`** — Address field for usdt_polygon
- Line 66: Updated address field condition from `data.method === 'usdt_trc20'` to `(data.method === 'usdt_trc20' || data.method === 'usdt_polygon')` so Polygon withdrawals also save the destination address.

**Frontend Audit Findings (reported, not fixed — not critical runtime errors):**
1. Admin deposits/withdrawals typed as `Investment[]` (lines 568-569) but actually Deposit records — shape is compatible, just misleading type naming
2. Line 5907: `(u as any).investment?.trader?.name` uses `as any` cast — type mismatch workaround
3. The `handleWithdraw` function (line 1497) reads `form.method` via HTMLSelectElement cast, but when NowPayments is enabled the method comes from a `<Select>` (radix) component which doesn't set form values the same way as native `<select>`. This works because of how radix Select sets values on hidden inputs, but could be fragile.

- Ran `bun run lint` — passes with no errors
- Checked dev log — no errors from our changes (only Bitget API 403s which are external)

Stage Summary:
- Affiliate ranks now use Portuguese names (Bronze/Prata/Ouro) with correct commissionBoost values (1/2/3)
- getTeamBonusPct now queries AffiliateRank table dynamically instead of hardcoding thresholds
- Fixed critical withdrawal dialog bug: manual-only mode now shows method selector and destination input
- Withdrawal validation schemas updated to accept usdt_polygon method
- Withdrawal route now maps usdt_polygon network correctly
- Affiliate withdrawal route now saves address for usdt_polygon method
---
Task ID: 4-b
Agent: Audit Agent
Task: Audit remaining API routes for bugs, security issues, inconsistencies

Work Log:
- Read worklog.md for context from previous agents (6 prior tasks documented)
- Read all 32 route files in full
- Read 2 support files: src/lib/nowpayments.ts, src/lib/market-data.ts
- Read src/lib/auth.ts and src/lib/api-utils.ts for auth context
- Compiled comprehensive audit with 28 issues across CRITICAL/HIGH/MEDIUM/LOW severity

AUDIT REPORT — 32 API Routes

════════════════════════════════════════════════
CRITICAL (6 issues)
════════════════════════════════════════════════

1. File: /api/nowpayments/webhook/route.ts
   Line: ~193
   Issue: Webhook payment processing updates `totalInvested` on deposit confirmation. `totalInvested` should only increment when user invests in a plan, not on raw deposit. This inflates totalInvested to 2x actual (deposit credits it, then investment credits it again).
   Fix: Remove `"totalInvested" = (CAST("totalInvested" AS NUMERIC) + ${userAmount})::text` from the raw SQL update. Only update `balance` and `hasInvested`.

2. File: /api/nowpayments/webhook/route.ts
   Line: ~110-121
   Issue: Race condition — double-crediting possible. The check `if (isPaymentFinal(deposit.paymentStatus) && deposit.splitProcessed) return;` is NOT atomic. Two concurrent webhooks for the same payment can both pass this check and both credit user balance. No `SELECT FOR UPDATE` row lock on the deposit record.
   Fix: Add `SELECT ... FOR UPDATE` on nowPaymentsDeposit row inside the transaction, or use an idempotency key with a unique constraint.

3. File: /api/nowpayments/webhook/route.ts
   Line: ~254-258
   Issue: `nowPaymentsDeposit.update()` is executed OUTSIDE the `$transaction` block. If the transaction succeeds (balance credited) but the deposit status update fails, the deposit remains in a non-final state. The next webhook will re-process and double-credit.
   Fix: Move `db.nowPaymentsDeposit.update()` inside the `$transaction` block using `tx.nowPaymentsDeposit.update()`.

4. File: /api/affiliate/route.ts
   Line: ~276-310
   Issue: Badge auto-award race condition causes double-crediting. The `upsert` with `update: {}` means two concurrent GET requests both pass the `awardedMap.has()` check, both call `upsert` (one creates, one no-ops), but BOTH proceed to credit `affiliateBalance` via `$executeRaw`. User gets rewarded 2x (or Nx for N concurrent requests).
   Fix: Wrap the upsert + balance credit in a transaction with `SELECT FOR UPDATE` on the User row. Or use a unique constraint check that throws before the balance credit.

5. File: /api/nowpayments/webhook/route.ts (nowpayments.ts lib)
   Line: nowpayments.ts:480-483
   Issue: Webhook signature verification returns `true` when IPN_SECRET is not configured. In production, if IPN_SECRET is accidentally unset, ALL webhook payloads are accepted without verification — an attacker could forge deposit confirmations to credit arbitrary balances.
   Fix: Return `false` (reject) when `ipnSecret` is empty, or throw an error. At minimum, add a production environment check that refuses to accept unverified webhooks.

6. File: /api/team-bonus/route.ts
   Line: 4, 8-9, 26-40
   Issue: Uses `requireAuth` from `@/lib/api-utils` (returns `string | null`) instead of `@/lib/auth` (throws on failure, returns full SessionPayload). While the null-check handles it functionally, the api-utils version doesn't re-verify from DB and is inconsistent with every other route. MORE IMPORTANTLY: hardcoded tier thresholds (10/20/30) don't match actual DB AffiliateRank thresholds (1/5/15 as fixed in Task ID 3). The `getTeamBonusPct` function was fixed to query DB, but this route's tier labels are still hardcoded with wrong values.
   Fix: Import `requireAuth` from `@/lib/auth`. Replace hardcoded tier thresholds with DB AffiliateRank queries to match the dynamic getTeamBonusPct behavior.

════════════════════════════════════════════════
HIGH (9 issues)
════════════════════════════════════════════════

7. File: /api/admin/stats/route.ts
   Line: 21-56
   Issue: Performance — loads ALL deposits, ALL withdrawals, ALL users, ALL commissions into Node.js memory and aggregates with `.reduce()`. Will OOM on large datasets.
   Fix: Use Prisma `aggregate({ _sum: { amount: true } })` and `count({ where: ... })` instead of `findMany` + reduce.

8. File: /api/admin/affiliates/route.ts
   Line: 23-33
   Issue: Three separate `findMany` calls to load all/paid/pending commissions — should use `aggregate` + `count` with where filters. Same OOM risk as stats route.
   Fix: Replace with `db.affiliateCommission.aggregate({ _sum: { commissionAmount: true }, _count: true })` with appropriate where clauses.

9. File: /api/nowpayments/webhook/route.ts
   Line: ~296-331
   Issue: Payout FINISHED handler doesn't use a transaction — updates deposit status, transaction status, and user totalWithdrawn as separate queries. If any fails partway, data is inconsistent.
   Fix: Wrap the FINISHED handler's DB operations in `db.$transaction()`.

10. File: /api/admin/affiliate-contests/route.ts
    Line: 28-37, 86
    Issue: No Zod validation on POST/PUT body. Contest fields (name, dates, rewardPool, metric) are taken directly from request body without schema validation. The `metric` field could be any arbitrary string.
    Fix: Create `adminAffiliateContestSchema` with zod and `.parse(body)` before DB operations.

11. File: /api/admin/affiliate-milestones/route.ts
    Line: 90-99, 144
    Issue: No Zod validation on POST/PUT body. Milestone fields (name, targetCount, rewardType, rewardValue) are taken directly from request body without schema validation.
    Fix: Create `adminAffiliateMilestoneSchema` with zod and `.parse(body)` before DB operations.

12. File: /api/admin/vouchers/[id]/route.ts
    Line: 14
    Issue: No Zod validation on PATCH body. The `action` field must be one of 'revoke'|'extend'|'complete', but this is only checked at runtime with if/else. `extendDays` could be any type.
    Fix: Create a zod discriminated union schema that validates action + corresponding fields.

13. File: /api/nowpayments/generate-address/route.ts
    Line: 19
    Issue: No validation on `currency` parameter. An attacker could pass arbitrary strings that get sent to the NowPayments API. Should whitelist against CURRENCY_MAP.
    Fix: Validate `currency` against `Object.keys(CURRENCY_MAP)` or a zod enum.

14. File: /api/admin/nowpayments/route.ts
    Line: 178-180
    Issue: Sequential DB queries inside stats section that should be parallelized. `await db.nowPaymentsDeposit.count()`, then `await db.nowPaymentsPayout.count()`, then `await db.nowPaymentsSubAccount.count()` execute one-by-one.
    Fix: Use `Promise.all([...])` for the three count queries.

15. File: /api/nowpayments/webhook/route.ts
    Line: ~224-235
    Issue: Split transaction record uses `type: 'deposit'` for the platform split amount. This is a platform fee, not a user deposit. It will inflate user deposit stats.
    Fix: Use a different transaction type like `'platform_split'` or `'fee'` to distinguish from actual deposits.

════════════════════════════════════════════════
MEDIUM (8 issues)
════════════════════════════════════════════════

16. File: /api/affiliate/route.ts
    Line: 31-34
    Issue: N+1 query pattern — 11 sequential DB queries for referral tree levels (for loop from 1 to 11). Same pattern in /api/user/route.ts lines 55-58.
    Fix: Use recursive CTE or a single query with recursive referral chain.

17. File: /api/nowpayments/statement/route.ts
    Line: 34-54
    Issue: Loads ALL user transactions and deposits into memory, sorts in JS, then paginates. Will be slow for users with many records.
    Fix: Apply pagination at the DB query level before combining results, or use a cursor-based approach.

18. File: /api/crypto/stats/route.ts
    Line: 8-11 (via market-data.ts:104-123)
    Issue: `getTradingStats()` returns hardcoded mock values ('12,847' users, '$4,231,590' invested). `getPlatformStats()` returns hardcoded '$3.2T' market cap and '52.4%' BTC dominance. This is misleading to users.
    Fix: Either remove the mock data and show real DB stats, or clearly label as "simulated" in the response.

19. File: /api/crypto/prices/route.ts
    Line: 15-20
    Issue: `getCryptoPrices()` only fetches bitcoin, ethereum, tether, usd-coin from CoinGecko. But the route tries to access `prices.kaspa` and `prices.litecoin` which are always undefined, falling back to hardcoded defaults. Kaspa and Litecoin are never actually fetched.
    Fix: Add 'kaspa' and 'litecoin' to the CoinGecko API call's `ids` parameter.

20. File: /api/nowpayments/currencies/route.ts
    Line: 8
    Issue: Public endpoint with no rate limiting calls external NowPayments API when admin currencies aren't configured. Could be abused for DoS against the NowPayments API.
    Fix: Add rate limiting or always require admin-configured currencies (remove the API fallback path).

21. File: /api/admin/nowpayments/route.ts
    Line: 22-23, 57-58
    Issue: When `section === 'all'`, skip is set to 0 and take to 50, but `depositPagination`/`payoutPagination` still report the original `page`/`limit` from the query string. This confuses frontend pagination — it shows page 1 data but claims it's page N.
    Fix: When `section === 'all'`, set pagination values to match the actual query parameters (page=1, limit=50).

22. File: /api/nowpayments/webhook/route.ts
    Line: 24, 54
    Issue: English error messages ('Invalid JSON', 'Invalid signature') in a Portuguese error codebase. All other routes use Portuguese.
    Fix: Change to Portuguese: 'JSON inválido', 'Assinatura inválida'.

23. File: /api/admin/nowpayments/config/route.ts
    Line: 147
    Issue: English log message 'Updated NowPayments config: ...' in admin log. All other admin logs use Portuguese.
    Fix: Change to 'Configurações NowPayments atualizadas: ...'

════════════════════════════════════════════════
LOW (5 issues)
════════════════════════════════════════════════

24. File: /api/user/route.ts
    Line: 4
    Issue: Redundant import — `d` is imported separately on line 4 after being importable with `requireAuth` from line 3. Not a bug, just unnecessary.
    Fix: Merge into single import: `import { requireAuth, d } from '@/lib/auth';`

25. File: /api/admin/vouchers/[id]/route.ts
    Line: 6
    Issue: Uses PATCH for actions (revoke/extend/complete) while other admin routes use PUT for updates. Inconsistent REST convention.
    Fix: Either document this as intentional (PATCH for partial/action updates) or migrate to PUT.

26. File: /api/admin/splits/route.ts
    Line: 64
    Issue: `splitPct` validation uses `d()` which returns 0 for non-numeric strings. Passing `splitPct: "abc"` would be silently treated as 0 instead of rejected.
    Fix: Add explicit type check before `d()` — reject if `isNaN(Number(splitPct))`.

27. File: /api/nowpayments/webhook/route.ts
    Line: 86-97
    Issue: Webhook always returns 200 even on fatal errors. While this is correct for webhook delivery (prevents retries), the error is silently swallowed. The `processingError` field is stored in the webhook log, but there's no alert mechanism for failed webhooks.
    Fix: Add monitoring/alerting for webhooks with `processingError` set.

28. File: /api/admin/affiliate-milestones/route.ts
    Line: 7-58
    Issue: DEFAULT_MILESTONES are seeded on every GET request when table is empty. If all milestones are deleted, they'll reappear on next GET. This may be unexpected for admins who intentionally cleared them.
    Fix: Use a separate seed endpoint or only seed during initial setup.

════════════════════════════════════════════════
SUMMARY
════════════════════════════════════════════════
- CRITICAL: 6 issues (race conditions, data integrity, security bypass)
- HIGH: 9 issues (performance, missing validation, missing transactions)
- MEDIUM: 8 issues (N+1 queries, mock data, inconsistent pagination, language)
- LOW: 5 issues (style, minor logic, monitoring)
- Total: 28 issues across 32 files audited
- No files modified (read-only audit)

Top priority fixes:
1. Webhook race condition + deposit update outside transaction (#1, #2, #3)
2. Badge auto-award race condition (#4)
3. Webhook signature bypass when IPN_SECRET unset (#5)
4. team-bonus hardcoded thresholds (#6)
5. Admin stats OOM risk (#7, #8)
---
Task ID: 4-b
Agent: Fix Agent
Task: Fix team-bonus route auth + hardcoded tiers + badge auto-award race

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents
- Read all target files before making changes: team-bonus/route.ts, affiliate/route.ts, auth.ts, api-utils.ts, affiliate.ts

**Fix 1: `/home/z/my-project/src/app/api/team-bonus/route.ts`**
- Changed `requireAuth` import from `@/lib/api-utils` (returns `string | null`) to `@/lib/auth` (throws on failure, returns full SessionPayload) — consistent with all other user-facing routes
- Kept `apiSuccess, apiError, handleApiError` from `@/lib/api-utils` (still needed)
- Changed `const userId = await requireAuth(request); if (!userId) return apiError('Não autorizado', 401);` to `const session = await requireAuth();` — the auth.ts version throws, so no null check needed
- Replaced hardcoded tier thresholds (10/20/30 referrals with silver/gold names) with dynamic AffiliateRank database query
- New logic queries `db.affiliateRank.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })` and iterates to find current and next rank
- Tier names now come from the database (e.g., bronze/prata/ouro) instead of hardcoded English names (silver/gold)
- The tier determination loop correctly handles: user qualifies for rank → set tier + nextTier; user doesn't qualify → set nextTier to this rank and referralsToNext

**Fix 2: `/home/z/my-project/src/app/api/affiliate/route.ts`**
- Replaced the badge auto-award loop that used `upsert` + independent `$executeRaw` cash reward with a `db.$transaction()` block
- Inside the transaction, for each badge:
  1. `tx.affiliateBadgeAward.findUnique()` — checks if already awarded (prevents double-credit by concurrent requests)
  2. If existing, `continue` (skip) — avoids re-crediting
  3. `tx.affiliateBadgeAward.create()` — awards the badge inside the transaction
  4. Cash reward (`tx.$executeRaw` + `tx.transaction.create`) — only runs after confirmed create, inside the same transaction
- This eliminates the race condition where two concurrent GET requests could both pass the `awardedMap.has()` check, both upsert (one creates, one no-ops), but BOTH credit the cash reward independently

- Ran `bun run lint` — passes with no errors
- Checked dev log — no errors from our changes

Stage Summary:
- team-bonus route now uses `requireAuth` from `@/lib/auth` (consistent with all other user-facing routes)
- team-bonus tier thresholds are now dynamic from AffiliateRank table instead of hardcoded 10/20/30
- Badge auto-award race condition fixed: upsert + independent cash credit replaced with transaction (findUnique + create + cash credit all atomic)
- No more double-crediting risk on concurrent badge auto-award requests
---
Task ID: 4-a
Agent: Fix Agent
Task: Fix NowPayments webhook critical bugs (5 bugs)

Work Log:
- Read /home/z/my-project/worklog.md for context from previous agents (7 prior tasks documented)
- Read both target files in full before making changes: webhook/route.ts (373 lines), nowpayments.ts (681 lines)

**Bug 1: Webhook inflates totalInvested** — `/home/z/my-project/src/app/api/nowpayments/webhook/route.ts`
- Line 195: Removed `"totalInvested" = (CAST("totalInvested" AS NUMERIC) + ${userAmount})::text,` from the raw SQL UPDATE
- `totalInvested` should ONLY increase when a user invests in a plan (via the Investment model), NOT when a deposit is confirmed
- Previously double-counted: once on deposit, once on investment
- The SQL now only updates `balance` and `hasInvested`

**Bug 2: Webhook race condition — no SELECT FOR UPDATE** — `/home/z/my-project/src/app/api/nowpayments/webhook/route.ts`
- Added `SELECT ... FOR UPDATE` row lock inside the transaction to prevent concurrent webhook processing
- `tx.$queryRaw` acquires exclusive row lock on the NowPaymentsDeposit row
- Added double-check inside the transaction: if the locked row already has a final status and splitProcessed, the transaction returns early
- This prevents two concurrent webhooks from both passing the non-atomic check at line 121 and both crediting the balance

**Bug 3: Webhook deposit update outside transaction** — `/home/z/my-project/src/app/api/nowpayments/webhook/route.ts`
- Moved `db.nowPaymentsDeposit.update()` from OUTSIDE the transaction (was at lines 255-258) to INSIDE the transaction
- Changed from `db.nowPaymentsDeposit.update()` to `tx.nowPaymentsDeposit.update()`
- If the transaction succeeds but the deposit status update previously failed (outside tx), re-processing would double-credit the balance
- Now the deposit record update is atomic with the balance credit

**Bug 4: Webhook signature bypass when IPN_SECRET is empty** — `/home/z/my-project/src/lib/nowpayments.ts`
- Changed the `!config.ipnSecret` check in `verifyWebhookSignature()` from always-allow to production-reject
- In production (`NODE_ENV === 'production'`): logs CRITICAL error and returns `false` (reject webhook)
- In development: still allows with a warning (backwards compatible)
- Previously, if IPN_SECRET was accidentally unset in production, ALL webhooks were accepted without verification — an attacker could forge deposit confirmations

**Bug 5: Payout FINISHED handler lacks transaction** — `/home/z/my-project/src/app/api/nowpayments/webhook/route.ts`
- Wrapped the FINISHED handler's three separate DB operations in `db.$transaction()`
- Previously: deposit update, transaction update, and user totalWithdrawn update were separate queries — if one failed, data was inconsistent
- Also simplified: removed the re-query of `linkedDeposit` (was `db.deposit.findUnique`) and used `payout.depositId` directly in `tx.transaction.updateMany`
- Now all three operations are atomic: deposit status update, transaction status update, and totalWithdrawn increment

- Ran `bun run lint` — passes with no errors
- Checked dev log — no errors from our changes (only Bitget API 403s which are external)

Stage Summary:
- 5 critical NowPayments webhook bugs fixed
- totalInvested no longer inflated on deposit (only on plan investment)
- Race condition eliminated: SELECT FOR UPDATE + double-check inside transaction
- Deposit record update now atomic with balance credit (prevents double-credit on re-processing)
- Webhook signature verification rejects unverified webhooks in production
- Payout FINISHED handler now uses transaction for data consistency
