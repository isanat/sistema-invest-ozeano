---
Task ID: 1
Agent: Main
Task: Integrate real Bitget copy trading data into the platform

Work Log:
- Researched Bitget API endpoints for copy trading data (traderRankingList, traderSearch)
- Created /api/bitget/traders route with caching (5-min TTL), search, and ranking filters
- Added BitgetTrader interface and state to page.tsx
- Redesigned the Investir tab with real copy trader cards (ROI, PnL, AUM, drawdown, mini charts)
- Added search bar and ranking filters (ROI, PnL, Followers, Pro)
- Updated landing page traders section to show Bitget data with fallback to DB traders
- Added graceful fallback when Bitget API is unavailable (403 from cloud IPs)
- Updated invest dialog to work with both Bitget and DB traders
- Added new translation keys (ES/PT): realData, searchPlaceholder, filterROI, pnlLabel, aumLabel, drawdown, followers, bitgetUnavailable
- Changed sidebar label from "Invertir/Investir" to "Copy Trade"
- Pushed to GitHub (fb4aeee)

Stage Summary:
- Bitget API integration complete - real trader data with search/filter
- Landing page shows real traders from Bitget when available
- Investir tab completely redesigned for copy trading UX
- Fallback mechanism when Bitget API is blocked
- All lint checks pass

---
Task ID: 2
Agent: Main
Task: Fix Prisma, Bitget API timeout, and verify demo data display

Work Log:
- Fixed Prisma schema: changed provider from postgresql to sqlite (DATABASE_URL=file:/home/z/my-project/db/custom.db)
- Ran db:push to create SQLite database
- Added 8-second timeout to Bitget API fetch calls to prevent server hangs
- Verified Bitget API returns 403 Forbidden from cloud IPs (not a credential issue - public endpoints don't need auth, but Bitget blocks server IPs)
- Verified demo trader data (14 realistic traders) returns correctly when Bitget API is unavailable
- Demo data responds to ranking filters (profit_rate, total_income, total_follow_profit, trader_pro) and search
- Verified PT-BR translations are correct for copy trading terminology
- Verified sidebar shows "Copy Trade" label in Portuguese
- Created admin user (admin@ozeano.com / Admin@123) and promoted to admin role
- All lint checks pass

Stage Summary:
- Database fixed (SQLite working)
- Bitget API has proper timeout (no more server hangs)
- Demo data works as fallback when Bitget is blocked
- Admin user created for testing
- Platform is functional

---
Task ID: 3
Agent: Main
Task: Filtrar moedas do nowpayments (só mostrar moedas configuradas na conta) + Separar menu admin vs investidor

Work Log:
- Updated /api/nowpayments/currencies/route.ts to use getMerchantCoins() API endpoint
- Added priority-based currency filtering: merchant coins > available currencies > CURRENCY_MAP fallback
- Added debug logging and merchantCoinsCount field in response
- Normalized currency codes to match CURRENCY_MAP casing
- Added adminViewMode state ('admin' | 'investor') with toggle in header
- Admin users can now switch between Admin and Investor views
- When in investor mode, admin sees full investor menu and dashboard
- Updated header title, mobile sidebar title, balance pill, and sidebar balance to respect view mode
- Added view mode toggle in header (Admin/Investidor buttons) and in user dropdown
- Updated isAdminTab logic to only be true when adminViewMode === 'admin'
- All lint checks pass

Stage Summary:
- NowPayments currencies now filtered to only show coins configured in merchant account
- Admin/Investor menu separation implemented with toggle switch
- Admin users can invest like regular users by switching to investor mode
- Both features working without errors

---
Task ID: 4
Agent: Main
Task: Fix login 500 errors and server crashes

Work Log:
- Diagnosed server crashing due to Turbopack parallel route compilation causing memory spikes
- Reduced bcrypt salt rounds from 12 → 4 for container compatibility
- Updated admin password hash in database to match new rounds
- Created start-dev.sh warmup script that pre-compiles API routes one at a time
- After warmup, all routes return 200 consistently and server remains stable
- Tested login 3x in a row - all return 200, server stays alive
- Landing API and page both return 200

Stage Summary:
- Root cause: Turbopack compiles routes on-demand; parallel compilation of bcrypt/jose-heavy routes caused OOM
- Fix: Warmup script pre-compiles routes sequentially before browser requests hit the server
- Login: admin@ozeano.com / Admin@123 works correctly
- All APIs tested and returning 200
- Pushed to GitHub (903ecb5)

---
Task ID: 5
Agent: Main
Task: Fix Vercel deployment - switch from SQLite to PostgreSQL

Work Log:
- Changed prisma/schema.prisma provider from "sqlite" to "postgresql" for Vercel compatibility
- Updated build script in package.json to handle DATABASE_URL properly
- Made bcrypt salt rounds environment-aware: 4 for dev, 10 for production
- Created .env.example with instructions for PostgreSQL setup
- Pushed to GitHub (8552f94)

Stage Summary:
- Prisma schema now uses PostgreSQL (required for Vercel)
- User needs to set DATABASE_URL in Vercel dashboard pointing to a PostgreSQL database
- Recommended providers: Neon (free), Supabase (free), Railway (free)
- bcrypt rounds: 4 (dev) / 10 (production)

---
Task ID: 6
Agent: Main
Task: Fix UX flow - Deposit button, Copy Traders confusion, new user onboarding

Work Log:
- Changed "Copiar" (Copy) buttons on Live Traders to "Ver Planos" (View Plans) with Eye icon - makes it clear traders are informational, not for direct copy trading
- Added prominent "Depositar Agora" (Deposit Now) button in investment modal when user has insufficient balance - redirects to deposit dialog
- Added new user onboarding CTA for users with $0 balance - shows 3-step flow: 1. Deposite 2. Escolha um Plano 3. Ganhe 5%/dia
- Updated investment dialog description from "{specialty} • {winRate}% win • {riskLevel}" to "{specialty} • 5% ROI/dia"
- Updated translations in all 4 languages (PT, ES, EN, ZH):
  - copyTraders.title: "Copy Traders" → "Traders da Plataforma" / "Platform Traders" / "平台交易员"
  - copy: "Copiar" → "Ver Planos" / "View Plans" / "查看计划"
  - copyTrader: "Copiar Trader" → "Trader da Plataforma" / "Platform Trader" / "平台交易员"
  - platformUsesTraders: Clarified that traders generate returns paid in investment plans, not for direct copying
- All lint checks pass
- Dev server running fine with hot reload

Stage Summary:
- UX flow now clear: Deposit → Choose Plan → Earn ROI
- No more confusion about "Copiar" buttons on traders
- New users with $0 balance see clear onboarding CTA with deposit button
- Investment modal guides users to deposit when balance is insufficient
- All translations updated across 4 languages
