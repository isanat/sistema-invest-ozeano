# Task 2: Fix Landing Page Hardcoded Values

## Agent: full-stack-developer

## Task
Fix hardcoded values in `/home/z/my-project/src/app/page.tsx` that don't match the ActionCash business plan.

## Business Plan Correct Values
- ROI: 3.3% (was incorrectly showing 5%)
- Affiliate levels: 6 levels (was showing 11)
- L1=5%, L2=3%, L3=1%, L4=1%, L5=1%, L6=2% = 13% total
- Total commission: 13% (was showing 28%)

## Files Modified
1. `/src/app/page.tsx` - 20 edits (ROI, levels, fallbacks, admin editor)
2. `/src/lib/i18n/translations.ts` - 12 edits (ES/EN/PT/ZH translations)
3. `/src/lib/translations.ts` - 28 edits (ES/PT/EN/ZH landing page translations)

## Key Changes
- All "5%" ROI references → "3.3%" (not L1=5% affiliate, which is correct)
- All "11 niveles/níveis/levels" → "6"
- All "28%" total → "13%"
- L6-L11 rows → L6 only
- Admin editor levels [1..11] → [1..6]
- Fallback percentages updated to match business plan
- Revenue pool example updated (N1: 10% → 5%)

## Verification
- `bun run lint` passes
- Dev server compiles successfully
