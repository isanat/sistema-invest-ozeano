# ActionCash Platform - Work Log

## 2024-03-05: Action Daymond Premium Feature & Business Plan Default Updates

### Task IDs: 10, 11, 12, 13

### Summary
Updated the ActionCash platform to support the new **Action Daymond Premium** feature and fixed default values across the codebase to match the ActionCash business plan.

### Changes Made

#### 1. Default Value Updates (Business Plan Alignment)
**Files Modified:**
- `/src/app/api/admin/migrate-config/route.ts`
- `/src/app/api/admin/reset-seed/route.ts`
- `/src/app/api/admin/setup/route.ts`

**Updated defaults:**
| Config Key | Old Value | New Value |
|---|---|---|
| `daily_roi_pct` | 5 | 3.3 |
| `min_deposit_usdt` | 10 | 5 |
| `min_investment_usdt` | 10 | 5 |
| `min_withdrawal_usdt` | 10 | 5 |
| `withdrawal_fee_pct` | 0 | 5 |
| `manual_withdrawal_enabled` | true | false |
| `nowpayments_withdrawal_enabled` | false | true |
| `team_bonus_salary_enabled` | false | true |
| `team_bonus_gold_enabled` | false | true |
| `team_bonus_daymond_enabled` | false | true |

**Added team_bonus config keys** (in all 3 files):
- `team_bonus_salary_enabled`, `team_bonus_salary_pct`, `team_bonus_salary_min_team_capital`, `team_bonus_salary_requires_own_investment`
- `team_bonus_gold_enabled`, `team_bonus_gold_pct`, `team_bonus_gold_min_team_capital`
- `team_bonus_daymond_enabled`, `team_bonus_daymond_package_amount`, `team_bonus_daymond_min_team_capital`, `team_bonus_daymond_duration_days`, `team_bonus_daymond_generates_commissions`
- `team_bonus_daily_cap_usd`, `team_bonus_max_depth`
- **NEW Daymond Premium keys:** `team_bonus_daymond_premium_enabled`, `team_bonus_daymond_premium_package_amount`, `team_bonus_daymond_premium_min_team_capital`, `team_bonus_daymond_premium_daily_roi_pct`, `team_bonus_daymond_premium_daily_cap_usd`

**Affiliate levels updated** (reset-seed and setup):
- Changed from 11 levels (10%,4%,3%,2%,1.5%,1%,0.8%,0.5%,0.4%,0.3%,0.5%) to 6 levels (5%,3%,1%,1%,1%,2%)

**Investment plans updated** (reset-seed and setup):
- All plan ROI changed from 5% to 3.3%
- Starter plan minAmount changed from 10 to 5

#### 2. Team Bonus Library (`/src/lib/team-bonus.ts`)
- Added Daymond Premium fields to `TeamBonusConfig` interface
- Added Daymond Premium config loading in `getTeamBonusConfig()`
- Updated `calculateTeamActiveCapital()` to exclude `daymond_premium` source (anti-inflation, same as `daymond`)
- Updated `getTeamStats()` to exclude `daymond_premium` source

#### 3. Monthly Daymond Cron (`/src/app/api/cron/monthly-daymond/route.ts`)
- Added Daymond Premium processing after regular Daymond processing
- Checks `config.daymondPremiumEnabled` flag
- Checks team capital >= `daymondPremiumMinTeamCapital` ($50,000)
- Creates virtual Investment with `source='daymond_premium'`
- Uses `daymondPremiumDailyRoiPct` (3.3%) for ROI calculation
- Reuses DaymondPackage model with packageAmount=$2000 for idempotency

#### 4. Daily ROI Distribution Cron (`/src/app/api/cron/distribute/route.ts`)
- Added daily cap check for `daymond_premium` source investments
- Reads cap from `team_bonus_daymond_premium_daily_cap_usd` config (default $99)
- Added `daymond_premium` to excluded sources for affiliate commissions

#### 5. Admin Team Bonus API (`/src/app/api/admin/team-bonus/route.ts`)
- Added Daymond Premium config keys to PUT handler:
  - `team_bonus_daymond_premium_enabled`
  - `team_bonus_daymond_premium_package_amount`
  - `team_bonus_daymond_premium_min_team_capital`
  - `team_bonus_daymond_premium_daily_roi_pct`
  - `team_bonus_daymond_premium_daily_cap_usd`

#### 6. User Team Bonus API (`/src/app/api/team-bonus/route.ts`)
- Added Daymond Premium qualification check
- Added estimated daily ROI calculation (capped at dailyCapUsd)
- Added `daymondPremiumProgress` to progress tracking
- Added `daymondPremium` section to API response with: enabled, qualified, minTeamCapital, packageAmount, dailyRoiPct, dailyCapUsd, estimatedDailyRoi

#### 7. Frontend (`/src/app/page.tsx`)
- Updated `siteConfig` defaults: minDepositUsdt 10→5, minWithdrawalUsdt 10→5, withdrawalFeePct 0→5
- Updated "Bônus de Equipe" badge from "3 Programas" to "4 Programas"
- Updated feature cards grid from 3-col to 4-col (sm:grid-cols-2 lg:grid-cols-4)
- Added Daymond Premium user-facing card (violet theme) with:
  - Qualification status badge
  - Daily ROI display (~$66/day)
  - Daily cap display ($99/day)
  - Progress bar toward $50,000 team capital
- Added Daymond Premium admin config section with:
  - Daymond Premium Ativado (switch)
  - Valor do Pacote Premium ($2000 input)
  - Capital Mínimo Premium ($50,000 input)
  - ROI Diário Premium (%) (3.3% input)
  - Cap Diário Premium ($) ($99 input)
- Updated admin description text to include Daymond Premium

### No Schema Changes Required
The `Investment.source` field is a `String` type (not an enum), so `daymond_premium` works without any Prisma schema migration. The `DaymondPackage` model is reused for both regular and premium packages, differentiated by `packageAmount`.

### Verification
- `bun run lint` passes with no errors
- Dev server compiles and runs successfully

---
Task ID: 2
Agent: full-stack-developer
Task: Fix landing page hardcoded values to match ActionCash business plan

Work Log:
- Fixed 4 occurrences of ROI "5%" → "3.3%" in `/src/app/page.tsx` (hero stats, dashboard preview badge, CTA card, quick-action button)
- Fixed 2 occurrences of "11 níveis" → "6 níveis" in `/src/app/page.tsx` (quick-action button, affiliate subtitle)
- Fixed 2 occurrences of "Unilevel 11 Níveis" → "Unilevel 6 Níveis" in `/src/app/page.tsx` (affiliate header, section title)
- Fixed 2 occurrences of fallback total "28%" → "13%" in `/src/app/page.tsx` (landing unilevel progress bar, affiliate total)
- Fixed L1 fallback "10%" → "5%" in 2 places in `/src/app/page.tsx` (landing L1 card, affiliate L1 card)
- Fixed L2-L5 fallback percentages from ['','4','3','2','1.5'] → ['','3','1','1','1'] in `/src/app/page.tsx`
- Fixed L6-L11 row → L6 only row in 2 places in `/src/app/page.tsx` (landing section, affiliate section)
- Fixed L6 fallback percentages from ['1.5','1','1','0.5','0.5','1'] → '2' in `/src/app/page.tsx`
- Fixed admin affiliate levels from [1..11] → [1..6] with defaults ['10','4','3','2','1.5','1','0.8','0.5','0.4','0.3','0.5'] → ['5','3','1','1','1','2'] in `/src/app/page.tsx`
- Fixed revenue pool example from "N1 ganha 10% de $5 = $0.50" → "N1 ganha 5% de $5 = $0.25" in `/src/app/page.tsx`
- Fixed 3 section comments in `/src/app/page.tsx` (5% Daily ROI → 3.3%, Unilevel 11 → 6, 11-LEVEL → 6-LEVEL)
- Fixed 12 translation strings in `/src/lib/i18n/translations.ts` (ES/EN/PT/ZH): hero descriptions (5% → 3.3%), affiliate subtitles (11 → 6 levels), FAQ answers (11 → 6 levels, 10% → 5%, 28% → 13%)
- Fixed 28 translation strings in `/src/lib/translations.ts` across all 4 locales (ES/PT/EN/ZH):
  - hero subtitles (5% → 3.3%)
  - advantage titles (5% → 3.3%)
  - stat1 values (5% → 3.3%)
  - unilevel subtitles (11 levels → 6 levels)
  - unilevel totals (28% en 11 niveles → 13% en 6 niveles)
  - affiliate descriptions (11 levels → 6 levels)
  - FAQ q3 answers (5% ROI → 3.3%, 11 levels → 6 levels)
  - FAQ q5 answers (11 levels → 6, L1=10% → 5%, L2=4% → 3%, L3=3% → 1%, 28% → 13%)

Stage Summary:
- All landing page hardcoded values now match ActionCash business plan
- ROI: 5% → 3.3% across all locales and components
- Affiliate levels: 11 → 6 with correct percentages (L1=5%, L2=3%, L3=1%, L4=1%, L5=1%, L6=2%)
- Total commission: 28% → 13%
- `bun run lint` passes with no errors
- Dev server compiles and runs successfully
