# Task 3 - Landing Page Redesign for ActionCash Business Plan

## Agent: full-stack-developer

## Summary
Redesigned the landing page to dynamically reflect the ActionCash business plan, removing duplicate sections and adding ActionCash-specific team bonus features.

## Files Modified

### 1. `/src/app/api/landing/route.ts`
- Added 16 new config keys to the API query and response
- Keys: `daily_roi_pct`, `min_investment_usdt`, `withdrawal_fee_pct`, `transfer_enabled`
- Team bonus keys: `team_bonus_salary_*`, `team_bonus_gold_*`, `team_bonus_daymond_*`, `team_bonus_daymond_premium_*`
- Default values match ActionCash business plan (3.3% ROI, $5 min, etc.)

### 2. `/src/app/page.tsx`
- Updated `landingConfig` state type to include all new fields
- Removed duplicate "Programa de Afiliados" section (was showing same affiliate levels twice alongside Unilevel section)
- Merged into single "Plano de Afiliados" section with CTA
- Redesigned Team Bonus section: Bronze/Prata/Ouro → Salário Semanal, Action Gold, Action Daymond, Daymond Premium
- Investment Tiers now calculate dynamically from `landingConfig.dailyRoiPct` (3.3%)
- All team bonus cards conditionally rendered based on `teamBonus*Enabled` flags

### 3. `/src/lib/i18n/translations.ts`
- Added `landing.teamBonus.*` type definitions (16 new keys)
- Added `landing.unilevel.inLevels` type definition
- Added translations for all 4 locales (ES, EN, PT-BR, ZH)
- Updated FAQ a3 answers (min investment $10 → $5, mention ActionCash bonuses)
- Updated FAQ a5 answers (detailed 6-level breakdown, mention ActionCash team bonuses)

### 4. `/src/lib/translations.ts`
- Added `landing.teamBonus` nested object for all 4 locales (ES, PT, EN, ZH)
- Added `landing.unilevel.inLevels` key for all locales
- Updated FAQ q3 and q5 answers to reflect ActionCash features

## Key Changes
- **Duplicate removed**: "Programa de Afiliados" section that was showing same levels as Unilevel
- **Team Bonus redesigned**: From generic Bronze/Prata/Ouro (+1%/+2%/+3%) to ActionCash-specific 4 programs
- **Dynamic ROI**: Investment tiers now use `landingConfig.dailyRoiPct` instead of hardcoded 5%
- **All values from API**: Team bonus thresholds, percentages, and package amounts come from landingConfig

## Verification
- `bun run lint` passes with no errors
- Dev server compiles successfully (200 OK responses)
