# Task: med-batch-1 — Fix MEDIUM Bugs in PLATAFORMA ROI

## Summary of Changes

### BUG 1: Voucher-funded investments generate full affiliate commissions
**Files modified:** 
- `src/app/api/investments/route.ts` (line 258-266)
- `src/app/api/cron/distribute/route.ts` (line 160-169)

**Fix:** Wrapped the `processCommissions` call in the investments route with `if (!result.usedVoucher)` so that voucher-funded investments skip affiliate commissions entirely. Similarly, in the cron distribute route, wrapped the `processCommissions` call with `if (investment.source !== 'voucher')` so ROI from voucher-funded investments also skips commissions.

### BUG 2: Rank bonusAmount never credited
**File modified:** `src/app/api/affiliate/route.ts` (lines 133-177)

**Fix:** Added rank upgrade bonus crediting logic after the rank determination block. When a user qualifies for a rank with a `bonusAmount > 0`, the code checks if the user already has a `rank_{rankname}` badge award. If not, it credits the bonus to `affiliateBalance` and `totalAffiliateEarnings`, creates the badge award record (if the badge exists), and creates a transaction record. Also added `ds` to the import from `@/lib/auth`.

### BUG 3: getTeamBonusPct ignores minEarnings rank requirement
**File modified:** `src/lib/affiliate.ts` (lines 774-804)

**Fix:** Updated `getTeamBonusPct` to also fetch the user's `totalAffiliateEarnings` and check `userEarnings >= d(rank.minEarnings)` in addition to `directReferrals >= rank.minReferrals`, matching the same logic used in `getRankBoost`.

### Lint
All changes pass `bun run lint` with no errors.
