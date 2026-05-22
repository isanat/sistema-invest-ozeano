# Fix Batch 3 — Bug 9: totalWithdrawn stale during pending withdrawals enables voucher lock bypass

## Task ID: fix-batch-3

## Summary
Fixed a critical security vulnerability where `totalWithdrawn` was only updated on admin approval, allowing users to bypass voucher withdrawal locks by making multiple pending withdrawals before any were approved.

## Vulnerability Details
- **Impact**: Users could extract ALL voucher profits by repeatedly requesting withdrawals while previous ones were still pending
- **Root Cause**: `calculateWithdrawalBreakdown()` used `user.totalWithdrawn` which only reflects approved withdrawals, not pending ones
- **Attack Vector**: Request withdrawal → totalWithdrawn stays $0 → request another withdrawal → still sees same maxWithdrawable

## Changes Made

### File: `src/app/api/withdraw/route.ts`
1. **Added pending withdrawal aggregation** (lines 34-43): After fetching `totalWithdrawn`, added a query to sum all pending/confirmed withdrawal amounts from the `Deposit` table
2. **Created `effectiveTotalWithdrawn`** (line 43): Combines `totalWithdrawn` + pending withdrawal amounts
3. **Replaced `totalWithdrawn` with `effectiveTotalWithdrawn`** in FIFO calculations:
   - Line 106: `ownSourceInBalance` calculation
   - Line 109: `voucherProfitsWithdrawn` calculation
4. **Added `effectiveTotalWithdrawn` to `_debug` object** (line 129) for admin transparency

### File: `src/app/api/nowpayments/withdraw/route.ts`
- **No changes needed** — imports `calculateWithdrawalBreakdown` from `../../withdraw/route` (line 13), so it automatically receives the fix

## Lint Result
- `bun run lint` passed with no errors
