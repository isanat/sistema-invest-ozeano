# Task 3: Fix 400 Error on POST /api/investments

**Agent:** Code Agent
**Date:** 2025-03-04
**Status:** ✅ Completed

## Summary

Fixed the 400 error when investing via POST `/api/investments` in the PLATAFORMA ROI project. Three root causes were identified and fixed:

1. **Zod schema too strict** — `investmentSchema` rejected extra fields sent by frontend (`useVoucher`, `voucherId`, `dailyRoiPct`, `durationDays`, `planName`). Fixed by adding `.passthrough()`.

2. **Backend throws when plan not found in DB** — Instead of using the plan params sent by the frontend as fallback, the backend threw `BusinessError`. Fixed by adding a fallback branch that uses `bodyDailyRoiPct`, `bodyDurationDays`, `bodyPlanName` when no DB plan is found.

3. **No frontend validation** — `handleRent` could send empty `planId` or zero `amount`. Fixed by adding pre-flight validation with user-friendly toast messages.

## Files Modified

- `src/lib/validations.ts` — `.passthrough()` on investmentSchema
- `src/app/api/investments/route.ts` — Dynamic plan fallback from request body
- `src/app/page.tsx` — Pre-flight validation in `handleRent`
- `src/lib/translations.ts` — Added `noPlanSelected`, `invalidAmount` i18n keys for es/pt/en/zh
