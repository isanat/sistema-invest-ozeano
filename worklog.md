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
