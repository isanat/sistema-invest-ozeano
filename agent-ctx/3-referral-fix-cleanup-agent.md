# Task 3: Referral Fix & Cleanup Agent

## Summary
Fixed the referral system (2 bugs), removed the old duplicate transfer route, and cleaned up all "PLATAFORMA ROI" text from source files.

## Changes Made

### A. Referral System Fixes

**Bug #1 — auth-modals.tsx `closeAndReset()` clears referral code**
- File: `src/components/auth/auth-modals.tsx`
- Problem: When user closed and reopened the register dialog, the referral code from URL was lost because `closeAndReset()` cleared `regReferral` to empty string, and the `useEffect` that populates it from URL only runs on mount.
- Fix: Modified `closeAndReset()` to restore `urlRefCode` instead of clearing when URL has a referral code.

**Bug #2 — Case-sensitive affiliate code lookup in register API**
- File: `src/app/api/auth/register/route.ts`
- Problem: `db.user.findUnique({ where: { affiliateCode: data.referralCode } })` is case-sensitive. Affiliate codes are generated in uppercase (e.g. `NAMEAB12`) but referral links might use lowercase.
- Fix: Changed to `db.user.findFirst({ where: { affiliateCode: { equals: data.referralCode.toUpperCase(), mode: 'insensitive' } } })`.

### B. Removed Old Transfer Route

- Deleted `src/app/api/transfer/route.ts` and its directory
- The old route used wrong config keys (`min_transfer_usdt`, `transfer_cooldown_minutes`) and the Transaction model
- The correct route `src/app/api/transfers/route.ts` already exists with proper keys (`transfer_min`, `transfer_cooldown_min`) and Transfer model

### C. Cleaned "PLATAFORMA ROI" Text

- `src/app/page.tsx`: "Plataforma ROI" → "ActionCash"
- `prisma/schema.prisma`: Comment header updated
- `Dockerfile`: Comment header updated
- `start.sh`: Echo message updated
- `DEPLOY-GUIDE.md`: Title updated
- Remaining occurrences in `agent-ctx/` and `worklog.md` are historical records — left as-is
