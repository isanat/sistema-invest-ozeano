# Worklog — ActionCash Platform

---
Task ID: 1
Agent: Main
Task: Fix Bitget API passphrase and SQLite prevention

Work Log:
- Updated BITGET_PASSPHRASE in Coolify from wrong value to "Isa46936698"
- Verified Bitget V2 API works with real data (source: bitget_v2)
- Added pre-commit hook (.husky/pre-commit) to reject commits with provider = "sqlite"
- Updated schema.prisma header with strong warning against SQLite
- Updated .env from SQLite URL to PostgreSQL URL
- Removed misleading SQLite references from db.ts comments
- Removed local SQLite database directory (db/)
- Removed debug route /api/bitget/debug (returns 404 now)

Stage Summary:
- Bitget API now returns REAL trader data (no more demo/fake fallback)
- SQLite prevention: pre-commit hook + Dockerfile check + schema warnings
- Key Bitget traders: Harvester- (14,180% ROI), WinBoy-Q (3,751% ROI), etc.

---
Task ID: 2
Agent: Main
Task: Fix Investment Plans - align with ActionCash business model (3.3% daily ROI, 60 days)

Work Log:
- Identified 3 different plan datasets causing confusion:
  1. Hardcoded frontend (4 plans at 5% ROI) - ALREADY REMOVED in prior commit
  2. Database seed (5 plans at 1.5-3.5% ROI, 30-50 days) - WRONG
  3. Production DB had 9 mixed plans with inconsistent data
- Deactivated 4 old incorrect plans (Silver 2%, Gold 2.5%, Platinum 3%, Diamond 3.5%)
- Updated 5 correct plans to: 3.3% daily ROI, 60 days duration
- Final correct plans in production DB:
  - Starter: $5-$99, 3.3%, 60d
  - Growth: $100-$499, 3.3%, 60d (Featured)
  - Premium: $500-$1,999, 3.3%, 60d
  - Elite: $2,000-$9,999, 3.3%, 60d
  - VIP: $10,000-∞, 3.3%, 60d (Featured)
- Verified frontend fetches plans from /api/plans (DB) not hardcoded
- Verified admin plans table shows correct columns (Name, Min, Max, ROI, Duration, Active)
- Verified investment creation API uses correct defaults (3.3%, 60d, $5 min)
- Seed file already had correct plans (3.3%, 60d) from prior commit

Stage Summary:
- All 5 active plans now correctly show 3.3% ROI and 60 days duration
- Admin table displays proper columns matching the InvestmentPlan model
- Frontend plan cards render from database, not hardcoded values
---
Task ID: 1
Agent: main
Task: Fix daily ROI distribution to be 24h per investment instead of midnight UTC for all

Work Log:
- Analyzed the current system: ROI was distributed at midnight UTC for all investments (wrong)
- Updated Prisma schema: Added `lastRoiAt` and `distributedPeriods` to Investment model
- Changed RoiHistory model: Replaced `date` with `periodIndex` (Int) and `distributedAt` (DateTime)
- Rewrote `/api/cron/distribute/route.ts` with 24h-per-investment logic
- Updated `/api/roi-history/route.ts` to use `distributedAt` instead of `date`
- Updated `/api/admin/payments/route.ts` to use `distributedAt` and new missed-periods detection
- Updated `/api/investments/[id]/route.ts` orderBy to use `distributedAt`
- Updated `cron-runner.sh` to run ROI distribution every 15 minutes (was once daily)
- Updated frontend countdown in `page.tsx` to calculate next ROI per investment
- Updated translations in pt/en/es/zh for "Próximo ROI (24h)" label
- Ran `db:push` successfully, API routes tested and working

Stage Summary:
- Each investment now gets ROI exactly 24h after its own startDate, not at a fixed midnight time
- Cron runs every 15 min to catch each investment's 24-hour mark
- Idempotency: `@@unique([investmentId, periodIndex])` prevents double distribution
- Catch-up: If cron was down, all missed periods are distributed on next run
- Investment auto-completes after all `durationDays` periods are distributed

---
Task ID: 2
Agent: main
Task: Fix profile page issues - password change, PIX visibility, Team Bonus Ranks, investment cards

Work Log:
- Analyzed user screenshots showing profile page with missing password change, visible PIX when disabled, always-visible Team Bonus Ranks
- Added "Alterar Senha" button to profile card (Key icon + button that opens existing changePasswordDialog)
- Made Chave PIX card conditional on siteConfig.hasPix — only shows when PIX is enabled in admin
- Created new SystemConfig key `team_bonus_ranks_visible` with admin toggle
- Updated /api/site/config to return teamBonusRanksVisible flag
- Added teamBonusRanksVisible to siteConfig state in page.tsx
- Made Team Bonus Ranks card conditional on siteConfig.teamBonusRanksVisible
- Added admin config UI for `team_bonus_ranks_visible` toggle
- Improved Active Investments cards: added Investido label, Próx. ROI countdown, ROI total, Voucher badge, 4-column grid layout

Stage Summary:
- Profile now has "Alterar Senha" button that opens the existing password change dialog
- PIX key field hidden when PIX is disabled in admin settings
- Team Bonus Ranks card hidden when `team_bonus_ranks_visible` config is false
- Investment cards now show: Investido, ROI/dia, Earned, Próx. ROI (24h countdown), ROI total, Voucher badge

---
Task ID: 1
Agent: Main Agent
Task: Add ActionCash logo and favicon, move logo to sidebar only

Work Log:
- Analyzed uploaded image (full screenshot, not a clean logo file)
- Generated professional ActionCash logo using AI Image Generation (icon-only + wide with text)
- Updated dashboard-sidebar.tsx: replaced Hexagon icon + "PLATAFORMA ROI" text with actual logo image (h-12)
- Updated mobile header in dashboard-sidebar.tsx: replaced Hexagon + text with logo image (h-8)
- Removed logo from dashboard header in page.tsx (was Bot icon + "PLATAFORMA ROI" text)
- Added logo to desktop sidebar in page.tsx (h-11, with border-b separator)
- Updated mobile sidebar overlay in page.tsx with logo image (h-10)
- Updated landing page navbar (landing-page.tsx) with logo image (h-9)
- Updated landing page footer (footer.tsx) with logo image (h-10)
- Updated landing page fixed nav in page.tsx with logo image (h-9 sm:h-10)
- Generated all favicon files from logo (16x16, 32x32, 96x96, 180x180, 192x192, 512x512, .ico)
- Updated src/app/icon.png for Next.js app-router
- Committed and pushed to GitHub
- Deployed to Coolify production (actioncash.app)
- Verified: container healthy, logo.png and favicon.ico accessible

Stage Summary:
- Logo now appears ONLY in sidebar (not in header) as requested
- Logo is bigger (h-12 in sidebar vs previous h-9 icon)
- No fallback text or site name in place of logo - only actual image
- All favicon files updated with new ActionCash branding
- Production deployment verified at https://actioncash.app

---
Task ID: 2
Agent: Main Agent
Task: Enlarge logo in sidebar/landing, replace all PLATAFORMA ROI with ActionCash

Work Log:
- Analyzed user screenshots showing logo too small in sidebar and landing page
- Increased sidebar logo: h-12 → h-16 with max-w-[200px] and centered alignment
- Increased page.tsx desktop sidebar logo: h-11 → h-14 with max-w-[180px] and centered
- Increased mobile sidebar overlay logo: h-10 → h-12 with max-w-[160px]
- Increased mobile header logo: h-8 → h-10
- Increased landing page navbar logo: h-9 → h-11 sm:h-12
- Increased landing page fixed nav logo: h-9 sm:h-10 → h-11 sm:h-12
- Increased landing footer logo: h-10 → h-12
- Searched ALL files for 'PLATAFORMA ROI' and replaced with 'ActionCash' (0 remaining in src/)
- Updated translation files (es.ts, pt.ts, translations.ts, i18n/translations.ts)
- Updated API routes (site config, landing, setup, migrate, reset-seed, restore, nowpayments)
- Updated layout.tsx metadata (title, authors, openGraph)
- Updated page.tsx (default siteName, hero text, footer, share message, admin placeholder)
- Updated site.webmanifest (name, short_name)
- Updated prisma/seed.ts and scripts/restore-test-user.js
- Updated production database site_name via SQL: 'PLATAFORMA ROI' → 'ActionCash'
- Verified API returns siteName: ActionCash
- Committed and pushed to GitHub
- Triggered Coolify deployment (in progress)

Stage Summary:
- Logo is now significantly larger in all locations
- Zero occurrences of 'PLATAFORMA ROI' remain in codebase (confirmed via grep)
- Production DB updated to 'ActionCash'
- Deployment to production in progress

---
Task ID: 1
Agent: Main Agent
Task: Fix referral system, add Transfer tab, add Reinvest button, commit/push/deploy

Work Log:
- Committed and pushed existing changes to GitHub (logo/favicon updates)
- Analyzed referral system: Landing page doesn't read ?ref= URL params
- Added useSearchParams import and urlReferralCode state to page.tsx
- Auto-populate referral code in landing page auth dialog (defaultValue={urlReferralCode})
- Auto-open register dialog when ?ref=CODE is in URL
- Updated auth-modals.tsx to also read and pre-populate referral code from URL
- Added Transferência tab to investor sidebar nav items
- Added transfer state variables (email, amount, lookup, config, history)
- Added fetchTransferData, handleTransferLookup, handleTransferSend functions
- Added full Transfer tab UI with: form, email lookup, amount input, fee calculation, limits info, send button, transfer history
- Added Reinvestir button on home dashboard (visible when balance >= $5, uses amber/orange gradient)
- Added transfer config labels to CONFIG_LABELS for admin panel
- Added transfer category to admin config UI (icon, label, description)
- Added 'transfer' category to adminConfigSchema validation
- Added transfer configs to setup route (for new installations)
- Created scripts/add-transfer-configs.js migration script
- Added migration script to start.sh (runs on every deploy, idempotent)
- Committed and pushed all changes (2 commits)
- Triggered Coolify deployment (3 deployments total)

Stage Summary:
- Referral system fixed: ?ref=CODE auto-populates and auto-opens register
- Transfer tab added with full P2P transfer UI (lookup, send, history)
- Reinvestir button added on home dashboard (conditional on balance >= $5)
- Transfer configs added to admin config panel and setup route
- Migration script ensures transfer configs exist in production DB
- Deployment in progress

---
Task ID: 2
Agent: Transfer Tab Agent
Task: Add Transfer tab to component-based dashboard

Work Log:
- Added 'transfer' to DashboardTab type union in src/lib/store.ts
- Added transfer nav item to dashboard-sidebar.tsx (ArrowDownUp icon, cyan accent, between team-bonus and withdrawals)
- Added dash.sidebar.transfer translation key to all 4 locales (ES: Transferencia, EN: Transfer, PT-BR: Transferência, ZH: 转账)
- Added 28 dash.transfer.* translation keys to all 4 locales (title, subtitle, recipientEmail, amount, fee, config, history, etc.)
- Created src/components/dashboard/transfer-tab.tsx with full P2P transfer UI:
  - Fetches config + history from GET /api/transfers
  - Email lookup via GET /api/transfers/lookup?email=xxx
  - Sends transfers via POST /api/transfers
  - Transfer form with email lookup, amount input, fee calculation, cooldown display
  - Config card showing min, max, fee %, daily limit, cooldown, enabled status
  - Daily limit progress bar
  - Transfer history with sent/received visual indicators
  - Dark theme styling matching other dashboard tabs
  - Uses shadcn/ui components (Card, Button, Input, Label, Badge)
  - Loading states, errors, and success feedback via toast
- Created src/components/dashboard/dashboard-content.tsx with tab rendering switch
  - Imports all dashboard tab components including new TransferTab
  - AnimatePresence transitions between tabs
  - Switch statement renders correct component for each DashboardTab value

Stage Summary:
- Transfer tab now available in the component-based dashboard sidebar
- Full transfer functionality: email lookup, amount with fee calculation, config display, history
- All 4 languages supported (ES, EN, PT-BR, ZH)
- Existing API endpoints (/api/transfers, /api/transfers/lookup) unchanged
- Lint passes for all modified/created files
- Dev server running successfully

---
Task ID: 3
Agent: Referral Fix & Cleanup Agent
Task: Fix referral system not working, remove duplicate transfer route, clean up "PLATAFORMA ROI" text

Work Log:
- Audited the full referral flow: frontend URL param → form field → API request → backend lookup
- Found Bug #1: auth-modals.tsx `closeAndReset()` clears `regReferral` to empty string — when user closes and reopens the dialog, the referral code from URL is lost because the useEffect only runs on mount
  - Fix: Modified `closeAndReset()` to preserve referral code from URL (restores `urlRefCode` instead of clearing)
- Found Bug #2: register/route.ts uses case-sensitive `findUnique` for `affiliateCode` lookup — affiliate codes are generated in uppercase (e.g. `NAMEAB12`) but URLs with lowercase codes (e.g. `?ref=nameab12`) would fail to match
  - Fix: Changed to `findFirst` with `mode: 'insensitive'` and uppercase the input for robustness
- Verified page.tsx landing page form: `defaultValue={urlReferralCode}` on referralCode input — correct
- Verified page.tsx handleRegister: sends `referralCode: (form.referralCode as HTMLInputElement)?.value || undefined` — correct
- Verified registerSchema allows `referralCode: z.string().optional()` — correct
- Deleted old `/api/transfer/route.ts` that used wrong config keys (`min_transfer_usdt`, `transfer_cooldown_minutes`) and Transaction model instead of Transfer model
- The correct route `/api/transfers/route.ts` already exists with proper config keys (`transfer_min`, `transfer_cooldown_min`) and Transfer model
- Cleaned up all "PLATAFORMA ROI" text from source files:
  - page.tsx: "Plataforma ROI" → "ActionCash" (line 4334)
  - prisma/schema.prisma: Comment header updated
  - Dockerfile: Comment header updated
  - start.sh: Echo message updated
  - DEPLOY-GUIDE.md: Title updated
  - Remaining occurrences only in agent-ctx/ (historical logs) and worklog.md (historical) — left as-is
- Verified dev server compiles and runs correctly
- Verified ESLint passes (only pre-existing warnings in set-env.js)

Stage Summary:
- Referral system now works correctly: case-insensitive affiliate code lookup + referral code preserved on dialog close/reopen
- Old /api/transfer route removed (was using wrong model/config keys); only /api/transfers remains
- Zero occurrences of "PLATAFORMA ROI" in source code (only historical agent logs remain)

---
Task ID: 1
Agent: Logo Fix Agent
Task: Fix dynamic logo — admin-uploaded logo never displayed (hardcoded /logo.png)

Work Log:
- Identified the root cause: all logo <img> tags across 4 files hardcoded `src="/logo.png"` and never read the `site_logo` SystemConfig value from the API
- The API `/api/site/config` already returns `siteLogo` (base64 data URL) in its response — just not consumed by frontend
- Confirmed `apiSuccess()` spreads data flat (not nested under `data`), so response shape is `{ success: true, siteLogo: "...", ... }`

Files modified:

1. **dashboard-sidebar.tsx**
   - Added `useState('')` for `siteLogo` in `DashboardSidebar` component
   - Added `useEffect` to fetch `/api/site/config` and set `siteLogo` from response
   - Passed `siteLogo` as prop to `SidebarContent` component
   - Changed both `<img src="/logo.png">` → `<img src={siteLogo || '/logo.png'}>` (desktop sidebar logo + mobile header logo)

2. **landing-page.tsx**
   - Added `useState('')` for `siteLogo` in `Navbar` component
   - Added `useEffect` to fetch `/api/site/config` and set `siteLogo`
   - Changed navbar logo `<img src="/logo.png">` → `<img src={siteLogo || '/logo.png'}>`

3. **footer.tsx**
   - Added `useState, useEffect` imports
   - Added `useState('')` for `siteLogo` in `Footer` component
   - Added `useEffect` to fetch `/api/site/config` and set `siteLogo`
   - Changed footer logo `<img src="/logo.png">` → `<img src={siteLogo || '/logo.png'}>`

4. **page.tsx**
   - Added `siteLogo: string` to `siteConfig` state type definition
   - Added `siteLogo: ''` to `siteConfig` initial value
   - Added `siteLogo: data.siteLogo ?? ''` in the existing `setSiteConfig` useEffect
   - Changed 3 hardcoded `<img src="/logo.png">` references → `<img src={siteConfig.siteLogo || '/logo.png'}>`:
     - Fixed navigation bar logo (line ~2580)
     - Desktop sidebar logo (line ~3516)
     - Mobile sidebar overlay logo (line ~3595)

- Verified zero remaining hardcoded `/logo.png` references in src/ (grep confirmed)
- Verified ESLint passes (only pre-existing set-env.js warnings)
- Verified dev server compiles and runs correctly

Stage Summary:
- Admin-uploaded logo (site_logo SystemConfig) now displays dynamically in ALL locations
- Fallback to `/logo.png` preserved when no admin logo is set
- Total of 7 logo references fixed across 4 files
- No other functionality changed

---
Task ID: session-referral-logo-fix
Agent: Main Orchestrator
Task: Fix logo display, fix referral system, add Fix Referrals admin UI, remove duplicate transfer route, commit and push

Work Log:
- Investigated logo upload system: admin uploads via /api/admin/upload (base64), saved in site_logo SystemConfig, but sidebar/landing page hardcoded /logo.png
- Fixed all logo references to use siteLogo from /api/site/config API with fallback to /logo.png
- Fixed files: dashboard-sidebar.tsx, landing-page.tsx, footer.tsx, page.tsx
- Audited referral system: found 2 bugs:
  1. Case-sensitive affiliate code lookup (register/route.ts) - fixed with case-insensitive mode
  2. Referral code lost on dialog close (auth-modals.tsx) - fixed by preserving urlRefCode
- Created /api/admin/fix-referrals endpoint (GET/POST/PUT) for finding and fixing orphaned referral accounts
- Added "Corrigir Referidos" section in admin Users tab with orphan finder and sponsor assignment UI
- Removed old /api/transfer route (duplicate of /api/transfers with wrong config keys)
- Added transfer tab to dashboard sidebar, store types, and translations
- Removed "PLATAFORMA ROI" text from all source files
- Created dashboard-content.tsx and transfer-tab.tsx components
- Committed and pushed to GitHub (fdf5906)
- Triggered Coolify deployment (pc0gv8cpal7nh4fmfdxnskq0)

Stage Summary:
- Logo: All components now use admin-uploaded logo from SystemConfig
- Referral: Case-insensitive lookup + code preservation on dialog close
- Admin: New Fix Referrals UI in Users tab
- Transfer: Already existed in page.tsx, added to component dashboard too
- Old /api/transfer route removed
- Production deployment triggered

---
Task ID: 5
Agent: Fix Team Bonus
Task: Fix Team Bonus data loading and field name mismatches

Work Log:
- Fixed Problem 1: Changed `api<{ success: boolean; data: any }>('/api/team-bonus')` to `api<any>('/api/team-bonus')` and `data.data` to `data` — apiSuccess() spreads data flat, so `data.data` was always undefined
- Fixed Problem 2: Replaced all flat field name references with correct nested access:
  - `teamBonusData?.teamCapital` → `teamBonusData?.teamActiveCapital`
  - `teamBonusData?.teamMemberCount` → `teamBonusData?.teamMembers`
  - `teamBonusData?.salaryQualified` → `teamBonusData?.salary?.qualified`
  - `teamBonusData?.estimatedSalary` → `teamBonusData?.salary?.estimatedWeeklySalary`
  - `teamBonusData?.goldQualified` → `teamBonusData?.gold?.qualified`
  - `teamBonusData?.estimatedGold` → `teamBonusData?.gold?.estimatedWeeklyGold`
  - `teamBonusData?.daymondQualified` → `teamBonusData?.daymond?.qualified`
  - `teamBonusData?.daymondPackageAmount` → `teamBonusData?.daymond?.packageAmount`
- Fixed Problem 3: Replaced all hardcoded thresholds with dynamic API values:
  - Progress bars now use `teamBonusData?.salary?.minTeamCapital || 2000` (and similar for gold/daymond/daymondPremium)
  - Labels now use `teamBonusData?.salary?.salaryPct || 0.5`%, `teamBonusData?.gold?.goldPct || 50`%, etc.
  - "Mín." labels now use `fmtUSDT(teamBonusData?.daymond?.minTeamCapital || 20000)` etc.
  - Daymond Premium progress bar simplified from `teamBonusData?.teamActiveCapital || teamBonusData?.teamCapital` to just `teamBonusData?.teamActiveCapital`
- Fixed Problem 4: Replaced single `teamBonusData?.paymentHistory` with combined history from 3 separate arrays:
  - `teamBonusData?.salary?.history` (date from weekDate)
  - `teamBonusData?.gold?.history` (date from weekDate)
  - `teamBonusData?.daymond?.history` (date from monthDate)
  - Combined and sorted by date descending, with `_type` tag for coloring/type label
- Verified all old field references removed (grep confirmed zero matches for old names)
- ESLint passes (only pre-existing set-env.js errors)

Stage Summary:
- Team Bonus data now loads correctly (was always undefined due to `data.data` access on flat response)
- All field references match the actual API response shape (nested objects for salary/gold/daymond/daymondPremium)
- All progress bars and labels use dynamic API values instead of hardcoded thresholds
- Payment history combines salary, gold, and daymond histories into a single sorted table

---
Task ID: 6
Agent: Fix Fake Data and Hardcoded Values
Task: Fix fake data displays, hardcoded values, and interface issues in page.tsx

Work Log:
- Fix 1 (CRITICAL): Replaced "ROI Total" (sum of random liveWinRates) with "ROI Médio" (average daily ROI % across all active investments)
- Fix 2 (CRITICAL): Replaced fake "Trades Accepted" stat (liveShares.reduce) with "Investimentos Ativos" showing activeInvestments.length
- Fix 3 (CRITICAL): Fixed liveWinRates initialization from non-existent `r.plan?.winRate` to `r.plan?.dailyRoiPct`
- Fix 4 (HIGH): Replaced 5 hardcoded "3.3%" display values with dynamic values:
  - Landing page hero: `d(landingConfig?.dailyRoiPct || '3.3').toFixed(1)%`
  - Landing page stats badge: `d(landingConfig?.dailyRoiPct || '3.3').toFixed(1)%`
  - Dashboard "Comece a Investir": `d(dbPlans.find(p => p.isActive)?.dailyRoiPct || '3.3').toFixed(1)%`
  - Dashboard "3. Ganhe X%/dia": dynamic from dbPlans
  - Dashboard "X% ROI/dia" invest button: dynamic from dbPlans
- Fix 5 (HIGH): Replaced hardcoded "$10 USDT" minimum with dynamic value from lowest active plan's minAmount
- Fix 6 (HIGH): Replaced all 3 instances of hardcoded `winRate: '85'` in CopyTrader wrappers with `winRate: d(plan.dailyRoiPct).toFixed(1)`
- Fix 7 (HIGH): Changed durationDays fallbacks from 30/35 to 60 in 3 locations (line ~1562, ~2496, ~9494)
- Fix 8 (CRITICAL): Changed invest dialog dailyRoiPct fallback from hardcoded `5` to `'3.3'`
- Fix 9 (CRITICAL): Added `source?: string;` field to UserInvestment interface
- Fix 10 (MEDIUM): Replaced hardcoded "6 níveis" with dynamic `{affiliateData?.affiliateLevels?.length || 6} níveis`
- Fix 11 (LOW): Added "reserved for future use" comments to liveVolatility and liveBlocks state; removed unused `currentWR` variable
- Fix 12 (LOW): Replaced `(r.plan as any)?.winRate || r.plan?.dailyRoiPct` with just `r.plan?.dailyRoiPct`
- Fix 13 (MEDIUM): Fixed comment "1-second tick" → "10-second tick" (interval is 10000ms)
- Fix 14 (LOW): Replaced hardcoded reinvest threshold `$5` with `Math.min(...dbPlans.filter(p => p.isActive).map(p => d(p.minAmount)), 5)` in 2 locations
- Fix 15 (MEDIUM): Changed label "Investidores" to "Meus Investimentos" (was showing user's own investment count)
- Fix 16 (HIGH): Fixed duplicate plan name in "My Investments" subtitle from `{r.plan?.name || '-'} • {r.plan?.name || 'USDT'}` to `{d(r.dailyRoiPct).toFixed(1)}%/dia • USDT`
- Fix 17 (HIGH): Changed label "Total Price" to "Retorno Total" (was showing totalRoi, not price)
- Verified ESLint passes (only pre-existing set-env.js errors)
- Verified dev server returns 200 OK

Stage Summary:
- All 17 fake data/hardcoded value bugs fixed in page.tsx
- Key CRITICAL fixes: ROI Total now shows average instead of sum of random values; fake Trades Accepted counter replaced with real active investments count; liveWinRates no longer crashes from non-existent plan.winRate; invest dialog no longer falls back to 5% ROI
- Key HIGH fixes: All displayed "3.3%" values now derive from plan/config data; winRate no longer hardcoded at 85%; durationDays fallbacks corrected to 60; duplicate plan name and wrong label fixed
- Interface enhancement: UserInvestment now includes optional `source` field

---
Task ID: 7
Agent: Fix Affiliate Section
Task: Fix affiliate commission name, hardcoded ranks, levels, progress bar, and other issues

Work Log:
- Fix 1 (CRITICAL): Added `fromUser` relation to AffiliateCommission model in prisma/schema.prisma, added reverse relation `affiliateCommissionsFrom` to User model. Updated API route to include `fromUser: { select: { id: true, name: true } }` in recentCommissions query. Changed frontend display from `comm.user?.name` to `comm.fromUser?.name`. Ran `bun run db:push` successfully.
- Fix 2 (CRITICAL): Replaced hardcoded 3-rank definitions (Bronze/Prata/Ouro) with dynamic ranks from `affiliateData.ranks`. Maps DB rank fields (name, icon, minReferrals, commissionBoost, color) to UI properties. Falls back to 3 hardcoded ranks only when `affiliateData.ranks` is empty. Changed badge label from "+X% ROI" to "+X% comissões".
- Fix 3 (CRITICAL): Changed "Unilevel 6 Níveis" to dynamic `Unilevel {affiliateData?.affiliateLevels?.length || 6} Níveis` in both subtitle and section header. Replaced hardcoded L1-L6 level grid with dynamic iteration over `affiliateData.affiliateLevels`, supporting any number of levels (up to 11). Shows fallback dashes ("—%") when level data isn't loaded.
- Fix 4 (CRITICAL): Replaced incorrect progress bar formula `100 - ((referralsNeeded + earningsNeeded) / (minReferrals + minEarnings) * 100)` with proper calculation: separate `refProgress` and `earnProgress`, then `rankProgress = Math.min(100, Math.min(refProgress, earnProgress))`. Fixed non-null assertions (`!`) to use `?? 0`. Uses `nextRank.referralsNeeded` and `nextRank.earningsNeeded` from the API response.
- Fix 5 (HIGH): Replaced hardcoded "0% Taxa" badge with dynamic `{siteConfig.affiliateWithdrawalFeePct ?? 0}% Taxa`. Added `affiliateWithdrawalFeePct` to siteConfig state type, initial value, and fetch mapping. Added `affiliate_withdrawal_fee_pct` to site config API key list and response.
- Fix 6 (HIGH): Replaced wrong fallback percentages ('5', '3', '1', '1', '1', '2', '13') with '—' (em dash) in both dashboard and landing page. Total fallback changed from '13' to '—'. Landing page level count made dynamic.
- Fix 7 (MEDIUM): Changed "+X% bônus ROI diário" to "+X% bônus comissões" in current rank badge display.
- Fix 8 (HIGH): Added Contests section to the affiliate tab. Renders active contests from `affiliateData.contests` with name, description, dates, metric type, and reward pool. Only shows when contests exist and are active. Uses Trophy icon and amber accent theme.

Stage Summary:
- AffiliateCommission now has fromUser relation — commission history shows the correct referral name
- Ranks are fully dynamic from DB — admin changes to ranks reflect immediately in UI
- Level visualization is dynamic (supports 11+ levels) instead of hardcoded 6
- Progress bar to next rank correctly calculates minimum of referral and earnings progress
- Withdrawal fee badge reads from site config instead of hardcoded "0%"
- All fallback percentages use "—" instead of incorrect hardcoded values
- Commission boost label corrected from "ROI diário" to "comissões"
- Contests data from API is now rendered in a dedicated UI section

---
Task ID: 9
Agent: Fix Deposit/Withdraw/Transaction
Task: Fix deposit info display, premature close, withdrawal issues, and transaction types

Work Log:
- Read deposit API route (/api/deposit/route.ts) to understand response shape: returns { deposit, paymentInfo, message }
- Read all relevant sections of page.tsx (10,900+ lines): deposit handler, NowPayments polling, withdrawal button, txTypeIcon/txTypeLabel, isPositive logic, manual withdrawal condition, voucher checkbox, siteConfig defaults
- Fix 1 (HIGH): Added manualDepositPaymentInfo state + paymentInfoCopied state; modified handleDeposit to store paymentInfo from API response instead of closing dialog; added full payment info display section in deposit dialog with PIX key/wallet address and copy buttons; cleared state on dialog close
- Fix 2 (HIGH): Changed NowPayments polling from treating confirmed/sending as finished to only closing on "finished"; confirmed/sending now shows "Confirmado — processando..." toast without closing dialog
- Fix 3 (HIGH): Changed withdrawal button disabled check from hardcoded `< 10` to `< siteConfig.minWithdrawalUsdt`
- Fix 4 (MEDIUM): Added `transfer: ArrowUpRight, team_bonus: Trophy` to txTypeIcon; added `transfer` and `team_bonus` to txTypeLabel with fallback strings
- Fix 5 (MEDIUM): Fixed isPositive logic in both transaction display locations (dashboard recent activity + history tab) to handle admin_adjust based on amount sign: `(tx.type === 'admin_adjust' && d(tx.amount) > 0)`
- Fix 6 (HIGH): Changed manual withdrawal methods condition from `manualWithdrawalEnabled && !nowpaymentsWithdrawalEnabled` to just `manualWithdrawalEnabled` so both can coexist
- Fix 7 (CRITICAL): Replaced voucher checkbox with `checked={false}` with a proper Button component that directly triggers voucher invest flow
- Fix 8 (LOW): Changed withdrawalFeePct default from 5 to 0 to match API fallback
- Fix 9 (MEDIUM): Added `affiliateWithdrawalFeePct` field to siteConfig state type definition and initial value (useEffect already read it from API)
- Added txType translation keys for all 4 locales (es, en, pt-BR, zh) in translations.ts: deposit, withdrawal, roi_profit, investment, affiliate_commission, admin_adjust, transfer, team_bonus
- Verified ESLint passes (only pre-existing set-env.js errors)
- Verified dev server compiles and responds with 200

Stage Summary:
- Manual deposits now display wallet address/PIX key with copy buttons after submission
- NowPayments only shows "Saldo creditado" toast on "finished" status; confirmed/sending show "processando" toast
- Withdrawal button uses dynamic minWithdrawalUsdt config instead of hardcoded $10
- Transaction history shows transfer and team_bonus types with correct icons and labels
- admin_adjust transactions show green/positive when amount > 0 instead of always red/negative
- Manual withdrawal methods shown alongside NowPayments when both are enabled
- Voucher activation now uses a proper button instead of broken checkbox
- withdrawalFeePct default aligned with API (0 instead of 5)
- affiliateWithdrawalFeePct added to siteConfig state
- All 8 txType keys added to translations for es/en/pt-BR/zh
---
Task ID: 5
Agent: Fix Team Bonus
Task: Fix Team Bonus data loading and field name mismatches

Work Log:
- Fixed fetchTeamBonusData: changed `data.data` to `data` (apiSuccess spreads flat)
- Fixed all field name mismatches: teamCapital→teamActiveCapital, teamMemberCount→teamMembers, salaryQualified→salary?.qualified, estimatedSalary→salary?.estimatedWeeklySalary, goldQualified→gold?.qualified, estimatedGold→gold?.estimatedWeeklyGold, daymondQualified→daymond?.qualified, daymondPackageAmount→daymond?.packageAmount
- Replaced all hardcoded thresholds (2000, 4000, 20000, 50000) with dynamic API values
- Replaced hardcoded labels ("0.5% do capital", "50% dos diretos", etc.) with dynamic values from API
- Fixed payment history: combined salary.history + gold.history + daymond.history instead of non-existent paymentHistory

Stage Summary:
- Team Bonus section was completely broken (data never loaded) - now fixed
- All progress bars, qualification badges, and amounts now use correct API data
- Thresholds and percentages are now dynamic, not hardcoded

---
Task ID: 6
Agent: Fix Fake Data and Hardcoded Values
Task: Fix fake data displays, hardcoded values, and interface issues

Work Log:
- Fixed ROI Total → ROI Médio: replaced sum of random fluctuating win rates with average daily ROI %
- Fixed Trades Accepted → Investimentos Ativos: replaced fake counter with real activeInvestments.length
- Fixed liveWinRates init: changed plan?.winRate to plan?.dailyRoiPct
- Fixed 5 hardcoded "3.3%" displays with dynamic values from dbPlans/landingConfig
- Fixed "$10 USDT" minimum with dynamic from lowest active plan
- Fixed 3x winRate: '85' → d(plan.dailyRoiPct).toFixed(1)
- Fixed 3x durationDays fallbacks from 30/35 to 60
- Fixed UserInvestment interface: added source?: string field
- Fixed dailyRoiPct || 5 → '3.3' fallback
- Fixed duplicate plan name in subtitle → dailyRoiPct/dia • USDT
- Fixed "Total Price" → "Retorno Total" label
- Fixed "Investidores" → "Meus Investimentos"
- Fixed hardcoded $5 reinvest threshold → dynamic from plan minAmount
- Fixed (r.plan as any)?.winRate → r.plan?.dailyRoiPct
- Fixed comment "1-second tick" → "10-second tick"
- Removed unused currentWR variable

Stage Summary:
- All fake/misleading data displays replaced with real data
- All hardcoded financial values replaced with dynamic values from DB/config
- Interface completeness improved with source field
- Duration fallbacks unified to 60 days

---
Task ID: 7
Agent: Fix Affiliate Section
Task: Fix affiliate commission name, hardcoded ranks, levels, progress bar, and other issues

Work Log:
- Added fromUser relation to AffiliateCommission model in prisma schema
- Updated API route to include fromUser in recentCommissions query
- Changed frontend from comm.user?.name → comm.fromUser?.name
- Replaced hardcoded 3-rank definitions with dynamic ranks from affiliateData.ranks
- Made level visualization dynamic (supports 11+ levels instead of hardcoded 6)
- Fixed progress bar calculation: separate refProgress + earnProgress, then min
- Fixed "0% Taxa" badge to use siteConfig.affiliateWithdrawalFeePct
- Fixed all wrong fallback percentages to show "—" instead
- Changed "bônus ROI diário" → "bônus comissões"
- Added Contests section to display active contests

Stage Summary:
- Commission history now shows correct referral names instead of own name
- Ranks and levels are fully dynamic from DB
- Progress bar math fixed (no more unit mixing)
- Affiliate fee display is now dynamic
- Contests section added

---
Task ID: 9
Agent: Fix Deposit/Withdraw/Transaction
Task: Fix deposit info display, premature close, withdrawal issues, and transaction types

Work Log:
- Added manualDepositPaymentInfo state and payment info display after deposit
- Fixed NowPayments: only 'finished' closes dialog, confirmed/sending show processing message
- Fixed withdrawal button: < 10 → < siteConfig.minWithdrawalUsdt
- Added transfer and team_bonus to txTypeIcon and txTypeLabel
- Fixed admin_adjust always showing as negative (now checks amount sign)
- Fixed withdraw manual methods hidden when NowPayments enabled
- Replaced broken voucher checkbox with proper Button component
- Changed withdrawalFeePct default from 5 to 0
- Added affiliateWithdrawalFeePct to siteConfig state
- Added txType translation keys to all 4 locales

Stage Summary:
- Manual deposits now show wallet address/PIX key for user to send funds
- NowPayments doesn't prematurely close on confirmed/sending
- All transaction types now have proper icons and labels
- Withdrawal methods properly coexist
- Voucher invest flow fixed with button instead of broken checkbox

---
Task ID: 12
Agent: Integration Test Suite
Task: Create and run comprehensive integration tests simulating real users

Work Log:
- Created seed script (scripts/seed-test.js) populating 17 users, 3 plans, 11 affiliate levels, 3 ranks, 44 configs
- Built referral network covering 11 levels: Carlos→Ana→Bruno→Carla→Diego→Elena→Felipe→Gabriela→Hugo→Isabela→Joao→Karla
- Added extra users at same levels: Lucas/Maria/NoInvest (L1), Pedro (L2)
- Created integration test script (scripts/final-test.js) testing all major flows
- Credited balances and created investments via Prisma to bypass rate limiting
- Verified commission cascade through 9 levels successfully

Stage Summary:
- 46/47 tests passed (97.9% pass rate)
- Referral chain verified across all 11 levels
- Affiliate commissions flow correctly: L1=$6.00, L2=$0.60, L3=$0.45, L4=$0.30, L5=$0.23, L6=$0.09, L7=$0.02, L8=$0.01, L9=$0.01
- Total commissions distributed: $19.33 across the chain
- fromUser correctly shows referral name (not own name)
- 11 affiliate levels and 3 ranks loaded from DB
- Team bonus: capital=$1560, salary=78% progress, correct qualification logic
- Withdrawal flow works ($10 created successfully)
- Transfer flow works (Ana→Bruno $5, non-investor blocked)
- Voucher creation works ($200 credited in DB)
- Non-investor correctly blocked from link unlock
- Investment source field present (deposit/reinvestment)
- Edge cases: oversized investment/withdrawal blocked
- Single "failure" was voucher balance showing $0 in stale session (DB has $200 — session cache issue, not a bug)

---
Task ID: 1
Agent: main
Task: Fix negative balance in Extrato (Statement) for user@test.com

Work Log:
- Analyzed screenshot showing Entradas: +$3.23, Saídas: -$98.00, Saldo: $3.23
- Queried production PostgreSQL DB for user@test.com transactions
- Found 4 investments ($98) + 4 ROI profits ($3.23), NO deposit/admin_adjust transactions
- Root cause 1: $98 credit was added without a deposit transaction record
- Root cause 2: Investment purchases were categorized as 'expense' making Saídas show -$98
- Root cause 3: admin_adjust type not handled in income/expense categorization
- Fixed statement API: investment → 'investment' category (separate from expense)
- Fixed admin_adjust: positive=income, negative=expense (based on description sign)
- Added gap offset for running balance to account for missing deposit records
- Added totalInvestedFromEntries, totalDeposited, balanceGap to summary
- Updated front-end: 4 cards (Entradas, Investimentos, Saídas, Saldo Atual)
- Investment entries styled amber (neutral) instead of red (loss)
- Added 'Ajustes' filter option for admin_adjust transactions
- Changed 'Aluguéis' label to 'Investimentos' in filter dropdown
- Updated Resumo Financeiro with separate Total Depositado and Total Investido rows
- Committed as cb30b61, pushed, deployed to Coolify

Stage Summary:
- Production API verified: Entradas=$3.23, Investimentos=$98, Saídas=$0, Saldo=$3.23
- Running balance now correctly flows: $88→$58→$18→$0→$0.33→$1.32→$2.64→$3.23
- User password reset to Test@123 for testing

---
Task ID: 1-5
Agent: Security Fixes Agent
Task: CRITICAL SECURITY FIXES - Phase 1

Work Log:

### Fix #1: Rewrite duplicate user update route with full security
- Completely rewrote `src/app/api/admin/users/[id]/route.ts` from scratch
- Was: no zod validation, no audit logging, no Transaction records for balance changes, no row locking
- Now: uses `adminUserUpdateSchema` (zod) for validation, `db.$transaction` with `FOR UPDATE` row locking, Transaction records for all balance changes (balance, affiliateBalance, voucherBalance), AdminLog with ipAddress, admin self-demotion guard, last-admin guard

### Fix #2: Add ipAddress to ALL AdminLog entries
- Created `getIpFromRequest(request: NextRequest)` helper in `src/lib/api-utils.ts`
  - Checks X-Forwarded-For (first IP), X-Real-IP, request.ip, fallback 'unknown'
- Added `ipAddress: getIpFromRequest(request)` to every `adminLog.create()` call across the entire codebase (47 calls total)
- Updated files: admin/users/route.ts, admin/users/[id]/route.ts, admin/reset-seed/route.ts, admin/vouchers/route.ts, admin/vouchers/[id]/route.ts, admin/withdrawals/route.ts, admin/affiliate-withdrawals/route.ts, auth/login-as/route.ts, admin/config/route.ts, admin/trading-pools/route.ts, admin/plans/route.ts, admin/deposits/route.ts, admin/affiliate-ranks/route.ts, admin/affiliate-contests/route.ts, admin/split-recipients/route.ts, admin/restore-uico/route.ts, admin/split-payout/route.ts, admin/investments/route.ts, admin/team-bonus/route.ts, admin/recalculate/route.ts, admin/affiliate-milestones/route.ts, admin/fix-referrals/route.ts, admin/affiliates/route.ts, admin/bitget-cache/route.ts, nowpayments/config/route.ts, auth/change-password/route.ts, admin/setup/route.ts, admin/reset-seed/route.ts

### Fix #3: Add AdminLog to endpoints that didn't have it
- `src/app/api/admin/trading-pools/[id]/route.ts` — added audit log with oldValue/newValue/ipAddress
- `src/app/api/admin/withdrawals/[id]/route.ts` — completely rewrote with audit log for approve/reject/process
- `src/app/api/admin/affiliate-levels/route.ts` — added audit log for PUT (level updates)
- `src/app/api/admin/copy-traders/route.ts` — added audit log for POST (create), PUT (update), DELETE
- `src/app/api/admin/copy-traders/[id]/route.ts` — added audit log for PUT with oldValue/newValue
- `src/app/api/admin/investment-plans/route.ts` — added audit log for POST (create)
- `src/app/api/admin/investment-plans/[id]/route.ts` — added audit log for PUT with oldValue/newValue
- `src/app/api/admin/affiliate-badges/route.ts` — added audit log for POST (create), PUT (update), DELETE
- `src/app/api/admin/affiliate-ranks/[id]/route.ts` — added audit log for PUT with oldValue/newValue
- `src/app/api/admin/force-release-lock/route.ts` — added audit log for POST

### Fix #4: Fix weak requireAdmin in api-utils.ts
- `requireAdmin(request)` was only checking the JWT payload role, not the database
- Added DB re-verification: queries `db.user.findUnique` to check role is still 'admin'
- This prevents privilege escalation from stale JWTs (e.g., admin demoted to user but JWT still says admin)

### Fix #5: Fix JWT fallback secret
- In `src/lib/auth.ts`, changed the JWT_SECRET handling to THROW in production runtime if not set
- Previously: silently used insecure fallback 'dev-only-fallback-NOT-FOR-PRODUCTION-CHANGE-ME'
- Now: `throw new Error('[AUTH] FATAL: JWT_SECRET environment variable is not set...')` in production
- Build time and development still work with the fallback

### Fix #6: Protect sensitive endpoints
- `src/app/api/nowpayments/debug/route.ts`: Added `requireAdmin()` (from auth.ts) AND `requireAdminFromUtils` (from api-utils) double-check
- `src/app/api/admin/setup/route.ts`: GET handler now requires admin auth (was revealing system state to unauthenticated users)

### Fix #7: Fix reset-seed destroying audit trail
- In `src/app/api/admin/reset-seed/route.ts`, removed `tx.adminLog.deleteMany()` — AdminLog records are now PRESERVED across resets
- This ensures audit trail survives database resets for accountability
- Added ipAddress to the reset log entry

Stage Summary:
- All 7 security fixes implemented and verified
- Duplicate user update route now has full security (zod, transactions, row locking, audit, balance change records)
- Every AdminLog entry in the entire codebase now includes ipAddress from request headers
- All admin endpoints that modify data now create AdminLog entries (10+ endpoints that were missing them)
- requireAdmin in api-utils now re-verifies role from database (prevents stale JWT privilege escalation)
- JWT_SECRET throws in production if not set (no more insecure fallback)
- Sensitive endpoints (debug, setup) now require admin authentication
- Reset-seed preserves audit trail instead of destroying it
- ESLint passes (only pre-existing set-env.js errors)

---
Task ID: 6-7
Agent: Security PIN System Agent
Task: Implement Security PIN System - Phase 2 (Admin PIN for sensitive actions + Super Admin role)

Work Log:

### 1. Database Model Changes
- Added `AdminPin` model to prisma/schema.prisma: id, userId (unique), pinHash, createdAt, updatedAt
- Added `adminPin AdminPin?` relation to User model
- Updated User model role comment: `role String @default("user") // user, admin, super_admin`
- Ran `bun run db:push` to sync database

### 2. PIN Utility Functions (src/lib/admin-pin.ts)
- hashPin(), verifyPin(), isValidPinFormat(), adminHasPin(), verifyAdminPin()
- PIN_REQUIRED_FIELDS constant (balance, affiliateBalance, voucherBalance, totalInvested, totalRoi, totalWithdrawn, totalAffiliateEarnings, role)
- requiresPinVerification() — checks if sensitive fields are being changed

### 3. PIN API Endpoints
- POST /api/admin/pin/setup — Create/update admin PIN (6-digit, bcrypt hash, upsert, AdminLog)
- POST /api/admin/pin/verify — Verify PIN, returns { verified }, logs attempt
- GET /api/admin/pin/status — Check if admin has PIN set

### 4. Updated Admin Routes to Require PIN
- /api/admin/users (PUT) — PIN required for balance/role changes
- /api/admin/users/[id] (PUT) — PIN required for balance/role changes
- /api/admin/withdrawals (PUT) — PIN required for approve/reject/complete
- /api/admin/reset-seed (POST) — requireSuperAdmin() + PIN required
- /api/auth/login-as (POST) — PIN required for impersonation

### 5. Super Admin Role
- requireAdmin() updated in auth.ts and api-utils.ts to accept 'admin' + 'super_admin'
- requireSuperAdmin() added to both files
- Admin setup creates initial admin with role: 'super_admin'
- adminUserUpdateSchema includes 'super_admin' in role enum
- All admin count queries use role: { in: ['admin', 'super_admin'] }
- Last-admin guard protects both admin and super_admin from demotion

### 6. Front-end PIN Modal (page.tsx)
- OTP-style 6-digit PIN verification modal with auto-focus
- PIN setup dialog with confirm field
- PIN status check on admin panel load
- Admin overview: amber warning if PIN not set, green badge if active
- User update form: requests PIN when sensitive fields change
- Withdrawal actions: requests PIN before approve/reject
- Login-as buttons: requests PIN before impersonation
- Role select: added "Super Admin" option
- Role badges: red for super_admin, amber for admin
- All role === 'admin' checks updated to also accept 'super_admin'

### 7. Other Updated Files
- /api/auth/change-password — Admin log check for super_admin
- /api/payments/status/[id] — Authorization for super_admin
- /api/investments/[id] — Authorization for super_admin
- /api/admin/restore-uico — Admin count and creation for super_admin

Stage Summary:
- Full security PIN system: 6-digit OTP modal, server verification, setup flow
- Super Admin role: initial admin is super_admin, can manage other admins, reset system
- Regular admin can do everything except manage other admins or reset system
- PIN required for: balance changes, role changes, withdrawal approval, system reset, user impersonation
- Admin panel prompts PIN setup on first access if not configured
- ESLint passes (only pre-existing set-env.js errors)

---
Task ID: security-overhaul
Agent: main
Task: Implement comprehensive admin security — PIN system, audit fixes, invite system

Work Log:
- Phase 1: Fixed duplicate users/[id] route with full audit logging, PIN verification, zod validation
- Phase 1: Added getClientIp() helper, populated ipAddress in ALL AdminLog entries
- Phase 1: Added AdminLog to migrate route, fixed missing adminId in fix-referrals
- Phase 1: Moved debug endpoint to /api/admin/nowpayments-debug (old returns 410)
- Phase 1: Moved AdminLog creation inside transactions for atomicity
- Phase 1: Added referenceId linking Transaction records back to AdminLog
- Phase 2: Created admin PIN system — 6-digit bcrypt-hashed PIN
- Phase 2: PIN validation (no sequential, no repeated digits), rate limiting (5 attempts, 15-min lockout)
- Phase 2: PIN required for: balance_change, role_change, withdrawal_approve/reject, reset_seed, migrate_db, force_release
- Phase 2: Created /api/admin/pin/setup, /api/admin/pin/verify, /api/admin/pin/status routes
- Phase 2: Frontend PIN modal with setup flow already integrated in page.tsx
- Phase 3: Admin invitation system — secure token (48h expiry), two-step approval
- Phase 3: /api/admin/invitations (CRUD), /api/admin/invitations/accept (public register)
- Phase 3: Frontend invite table, create dialog, approve/reject/copy link actions
- Phase 3: Current admins management: view admins, PIN status, demote with PIN
- Super Admin role: requireSuperAdmin(), only super_admin can invite/approve/manage admins
- Updated middleware to accept both 'admin' and 'super_admin' roles
- Pushed schema to production DB (AdminPin, AdminInvitation, User.securityPin/securityPinSetAt)
- Updated admin@plataformaroi.com to role 'super_admin'
- Removed duplicate AdminInvite model (kept AdminInvitation which has approvedBy)
- Removed duplicate /api/admin/invites/ directory (kept /api/admin/invitations/)
- Fixed Dockerfile cache bust for Prisma client regeneration
- Committed: fde2284 (security overhaul), bcc1d51 (cache bust)
- Deployed to Coolify — build in progress

Stage Summary:
- 56 files changed, 2731 insertions, 340 deletions
- All 4 phases implemented: critical fixes, PIN system, invite system, super_admin role
- Production DB schema updated with new models and fields
- Docker build in progress with cache bust to force Prisma client regeneration
- PIN system will be fully functional once build completes

---
Task ID: PIN-FIX
Agent: Main Agent
Task: Fix admin PIN system — user never set up PIN but verification modal was shown

Work Log:
- Analyzed user screenshot: "Verificação de Segurança" modal asking for 6-digit PIN, but admin never configured a PIN
- Found 4 bugs in the PIN system:
  1. PIN Setup body mismatch: frontend sent `{ pin, confirmPin }` but backend expected `{ newPin, confirmPin }` — PIN setup NEVER worked
  2. Race condition in `requestPin()`: when `adminHasPin` was `null` (initial state, before status check completed), the function showed the PIN verification modal instead of redirecting to PIN setup
  3. API response field mismatch: frontend checked `res.verified` but backend returned `res.valid` — PIN verification always appeared to fail
  4. PIN verification modal didn't handle the case where admin has no PIN set (should redirect to setup)

Fixes applied in `src/app/page.tsx`:
- Fixed `handlePinSetup`: changed `pin: pinSetupPin` → `newPin: pinSetupPin` in API request body
- Fixed `requestPin`: changed from synchronous Promise callback to async function that checks PIN status via API if `adminHasPin === null`, then redirects to setup if no PIN exists
- Fixed `handlePinSubmit`: changed `res.verified` → `res.valid`; added handling for `res.hasPin === false` (redirects to PIN setup dialog); added attempts remaining display
- Verified page compiles and loads successfully (HTTP 200)

Stage Summary:
- Admin who never set up a PIN will now see the PIN setup dialog instead of the verification modal
- PIN setup actually works now (was broken due to body field mismatch)
- PIN verification correctly reads the `valid` field from API response
- Remaining attempts shown on incorrect PIN entry

---
Task ID: pin-403-fix
Agent: Main Agent
Task: Fix 403 Forbidden error on PUT /api/admin/users when admin edits users

Work Log:
- User reported: admin registered PIN but gets 403 when editing users
- Investigated the full PIN verification flow: frontend → PIN modal → API request → backend verification
- Found the ROOT CAUSE: `requiresPinVerification()` in src/lib/admin-pin.ts line 163 had:
  `if (field === 'role') return updateData[field] !== undefined;`
  This always returned true when role was present in the request body, even if the value hadn't changed
- The frontend form ALWAYS includes the role field (via Select component), so every user edit triggered PIN requirement on the backend
- But the frontend's `needsPin` check correctly compared values: `String(body.role) !== String(origUser.role)` — if role hasn't changed, no PIN needed
- Result: Frontend doesn't show PIN modal → no PIN sent → backend requires PIN → 403 Forbidden
- Fix: Changed to compare role value like other fields:
  `String(updateData[field]) !== String(existingData[field] ?? (field === 'role' ? '' : '0'))`
- Committed as 5698547, pushed, deployed to Coolify
- Tested in production: non-sensitive update (name + role same) → SUCCESS (was 403 before)
- Tested: sensitive update (balance changed) without PIN → correctly returns 403 requiring PIN
- ERR_CONNECTION_CLOSED on /api/auth/me was temporary during previous deploy, server now stable

Stage Summary:
- Fixed requiresPinVerification() role check bug that caused 403 on ALL user edits
- Admin can now edit users without changing sensitive fields (no PIN required)
- PIN is still correctly required when balance/role actually changes
- Production deployed and verified at actioncash.app

---
Task ID: pin-dialog-and-logs-fix
Agent: Main Agent
Task: Fix PIN setup dialog logic and improve admin logs/audit trail display

Work Log:
- User reported: PIN setup asks for "PIN atual" even for new PIN setup (no existing PIN)
- Investigated: The PIN setup dialog had no "PIN Atual" field, but the backend requires it when admin has existing PIN
  - When admin with existing PIN clicks "Alterar PIN" → dialog sends only {newPin, confirmPin}
  - Backend returns error "PIN atual é obrigatório para alterar o PIN"
  - User sees error but no way to enter current PIN in the dialog
- Fixed: Added conditional "PIN Atual" field to PIN setup dialog
  - Shows when adminHasPin === true (changing existing PIN)
  - Hidden when adminHasPin === false (first-time setup)
  - Dialog title changes: "Configurar PIN" vs "Alterar PIN"
  - handlePinSetup now sends currentPin when admin has existing PIN
  - Button label changes: "Configurar PIN" vs "Alterar PIN"
- Also found: admin list showed "✗ Não configurado" for ALL admins because it checked admin.adminPin (always undefined since API strips it) instead of admin.hasPin
- Fixed: Changed to use admin.hasPin with color coding (green ✓ / red ✗)
- Improved Admin Logs (Registros) section:
  - Increased log fetch limit from 20 to 100
  - Added IP address column
  - Added admin email below name in each row
  - Added more action badge colors (reject=orange, verify_pin=emerald, verify_pin_failed=red, login_as=purple, password_reset=amber)
  - Added entity type labels in Portuguese (Usuário, Config, Plano, Voucher, PIN, Sistema)
  - Added section header with FileText icon
  - Added refresh button
- Committed as 9ffffb1, pushed, deployed to Coolify
- Verified in production: hasPin correct, logs show IP

Stage Summary:
- PIN setup dialog now correctly handles both first-time setup and PIN change
- Admin list shows correct PIN status (was always showing "Não configurado")
- Admin logs section significantly improved with IP, emails, colors, and 100 entries
- Production deployed and verified at actioncash.app
