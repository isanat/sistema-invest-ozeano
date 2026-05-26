# Worklog: Fix Career Plan & Team Bonus Sections

## Date: 2024-03-05

## Summary
Fixed two major issues on the ActionCash / PLATAFORMA ROI landing page:
1. The "PLANO DE CARREIRA" badge was incorrectly used on the Unilevel/Affiliate section
2. The team bonus section was a flat 4-card grid instead of a career ladder progression

## Changes Made

### 1. `/home/z/my-project/src/lib/i18n/translations.ts`
**Added to TranslationKeys type and all 4 locale objects (es, en, pt-BR, zh):**

- **Landing Badges** (15 keys): `landing.badges.copyTrading`, `landing.badges.liveDashboard`, `landing.badges.portfolioValue`, `landing.badges.winRate`, `landing.badges.trading`, `landing.badges.dailyRoi`, `landing.badges.simplePowerful`, `landing.badges.step`, `landing.badges.topTraders`, `landing.badges.dailyRoiTag`, `landing.badges.careerPlan`, `landing.badges.teamRewards`, `landing.badges.referralProgram`, `landing.badges.live`, `landing.badges.popular`

- **Career Plan** (4 keys): `landing.career.title`, `landing.career.subtitle`, `landing.career.progression`, `landing.career.unlockNext`

- **Unilevel** (4 keys): `landing.unilevel.title`, `landing.unilevel.subtitle`, `landing.unilevel.level`, `landing.unilevel.total`

- **Affiliate CTA** (1 key): `landing.affiliate.cta`

These keys were referenced in page.tsx but were missing from translations, causing raw key strings to display.

### 2. `/home/z/my-project/src/app/page.tsx`

**Fix 1: Unilevel Section (lines ~2840-2915)**
- Changed badge from `t('landing.badges.careerPlan')` → `t('landing.badges.referralProgram')`
- Changed title from `t('landing.unilevel.title')` → `t('landing.affiliate.title')`
- Changed subtitle from `t('landing.unilevel.subtitle')` → `t('landing.affiliate.subtitle')`
- Section now correctly labeled "PROGRAMA DE AFILIADOS" instead of "PLANO DE CARRERA"

**Fix 2: Career Plan Ladder (replaced lines ~2917-2995)**
- Replaced the flat 4-card grid "Bônus de Equipe ActionCash" section entirely
- New section uses a vertical timeline/stepper layout with:
  - Badge: `t('landing.badges.careerPlan')` ("PLAN DE CARRERA")
  - Title: `t('landing.career.title')` with `<em>` tag rendering for styled emphasis
  - Subtitle: `t('landing.career.subtitle')`
  - Gradient vertical connecting line (emerald → amber → cyan → violet)
  - 4 progressive steps, each slightly more prominent:
    - **NÍVEL 1**: 💰 Salário Semanal (emerald theme, smallest icon)
    - **NÍVEL 2**: 🥇 Action Gold (amber theme)
    - **NÍVEL 3**: 💎 Action Daymond (cyan theme, larger card padding)
    - **NÍVEL 4**: 👑 Daymond Premium (violet theme, ring glow, gradient overlay, "★ TOP" badge)
  - Each step has: level badge, unlock/progression label, name, value, description, min team capital, and extra info
  - Conditional rendering preserved (each step only shows if `enabled !== false`)
  - All dynamic API values preserved (`landingConfig?.teamBonusSalaryPct`, etc.)
  - Motion animations: `x: -20` slide-in with staggered delays

## Verification
- `bun run lint` passed with no errors
- Dev server compiles successfully and serves pages

---
Task ID: 2b-fix
Agent: Main Agent
Task: Fix raw translation key issue in landing page

Work Log:
- Discovered that page.tsx imports `useI18n` from `@/lib/i18n` which resolves to `/home/z/my-project/src/lib/i18n.tsx`
- This file imports from `./translations` which is the OLD nested-format file at `/home/z/my-project/src/lib/translations.ts`
- Previous agent incorrectly added translation keys to `/home/z/my-project/src/lib/i18n/translations.ts` (NEW flat-format file) which is NOT used
- Added missing keys to the OLD translations.ts for all 4 locales (es, pt, en, zh):
  - `landing.affiliate.subtitle` and `landing.affiliate.directReferrals`
  - `landing.career` section (title, subtitle, progression, unlockNext)
- Verified all 160 translation key lookups resolve correctly across all locales

Stage Summary:
- Root cause: Two i18n systems exist - old nested (used) and new flat (unused by page.tsx)
- All translation keys now resolve correctly
- Commit b618b80 pushed to official repository
