# Task 2 - Backend Library Files Update (Mining → Copy Trading ROI)

## Agent: Backend Lib Updater
## Task ID: 2

### Summary
Transformed backend library files from a mining/hashpower rental platform to a Copy Trading ROI platform.

### Files Modified

#### 1. `src/lib/affiliate.ts` (MOST CRITICAL)
- **MAX_DEPTH**: Changed from 5 to 11 (eleven affiliate levels)
- **CommissionMode**: Removed `mining_profit`, kept `system_margin` and `revenue_pool`, added `investment_profit`
- **Source types**: Changed from `'mining' | 'rental' | 'deposit'` to `'trading' | 'subscription' | 'deposit'`
- **Level percentages**: L1=10%, L2=4%, L3=3%, L4=2%, L5=1.5%, L6=1.5%, L7=1.5%, L8=1%, L9=1%, L10=1%, L11=1% (total ~28%)
- **Config key changes**: `affiliate_rental_bonus_pct` → `affiliate_investment_bonus_pct`
- **DB queries**: Uses `db.deposit` (not `db.investment` with type='deposit') for sustainability checks, matching new Prisma schema
- **AffiliateCommission**: Now uses `investmentId` field (already in Prisma schema)
- **Transaction referenceType**: Changed from `MiningHistory`/`MiningRental` to `RoiHistory`/`Investment`
- **Function renames**: `calculateMiningProfitCommission` → `calculateInvestmentProfitCommission`, `calculateRentalBonusCommission` → `calculateInvestmentBonusCommission`
- **Added**: `getDefaultLevelPercentages()` export for seeding 11 levels
- **Kept**: Sustainability cap system, rank boost system, daily commission cap

#### 2. `src/lib/validations.ts`
- **Removed**: `rentalSchema` (minerId + days), `adminMinerSchema` (mining hardware schema)
- **Added**: `investmentSchema` (planId + amount min 10)
- **Replaced**: Old `adminPlanSchema` (mining plan with minerId) → New `adminPlanSchema` (investment plan: name, description?, minAmount, maxAmount?, dailyRoiPct, durationDays, isActive, isFeatured, sortOrder)
- **Updated**: `adminConfigSchema` category: `'mining'` → `'trading'`
- **Updated**: `adminAffiliateLevelSchema`: level max changed from 5 to 11
- **Updated**: Type exports: `RentalInput` → `InvestmentInput`, `AdminMinerInput` removed

#### 3. `src/lib/market-data.ts`
- **Removed**: `MiningProfitability` interface, `getMiningProfitability()`, `getNetworkStats()`
- **Added**: `TradingStats` interface (totalUsers, totalInvested, totalRoiPaid, activeInvestments, avgDailyRoi)
- **Added**: `getTradingStats()` - returns mock trading performance data
- **Added**: `getPlatformStats()` - returns platform overview with BTC/ETH prices, Fear & Greed, market cap
- **Added**: `getETHPrice()` helper for Ethereum price
- **Updated**: `getCryptoPrices()` - Changed from mining coins (KAS, LTC, DOGE) to trading coins (ETH, USDC)
- **Kept**: `getUSDTBRLRate()`, `getBTCPrice()`, `getFearGreedIndex()` unchanged

#### 4. `src/lib/db.ts`
- No changes needed - just Prisma client export

#### 5. `src/middleware.ts`
- Changed `/api/miners` to `/api/plans` in public routes

### Important Notes
- Prisma schema was already updated for the Copy Trading ROI platform (Investment, InvestmentPlan, RoiHistory models)
- AffiliateCommission model already has `investmentId` field (no rentalId/miningHistoryId)
- Translation files (en/pt/es/zh) still contain mining references - these are a separate task
- API routes (cron/distribute, admin/setup, affiliate, nowpayments) still reference `mining_profit` - these are a separate task
