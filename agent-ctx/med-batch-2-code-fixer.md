# Task med-batch-2: Fix MEDIUM Bugs in PLATAFORMA ROI

## Summary

All 5 bugs were fixed successfully. Lint passed with no errors.

## Changes Made

### BUG 1: Voucher progress race condition — FOR UPDATE lock
**File:** `src/app/api/vouchers/progress/route.ts`
- Added `SELECT 1 FROM "Voucher" WHERE id = ${voucher.id} FOR UPDATE` inside the transaction to acquire a row-level lock
- Re-read the voucher after lock with `tx.voucher.findUnique()` and check if status is still `'active'`; if not, return early (already processed by another request)
- Replaced stale `remainingBalance` calculation with `freshRemaining` computed from the locked voucher data: `d(lockedVoucher.amount) - d(lockedVoucher.usedAmount)`

### BUG 2: voucherBalance can go negative
**Files:** `src/app/api/vouchers/progress/route.ts`, `src/app/api/admin/vouchers/[id]/route.ts`
- In the progress route: wrapped the voucherBalance deduction in `GREATEST(0, ...)` to prevent negative values
- In the admin voucher route (revoke action, line 55): applied `GREATEST(0, ...)` to the voucherBalance deduction
- In the admin voucher route (DELETE handler, line 179): applied `GREATEST(0, ...)` to the voucherBalance deduction

### BUG 3: Withdrawal method not validated against allowlist
**File:** `src/app/api/withdraw/route.ts`
- Added `VALID_WITHDRAWAL_METHODS = ['pix', 'usdt_trc20', 'usdt_polygon']` after Zod parse
- Added validation check: if method is not in the allowlist, returns error message

### BUG 4: Admin config values not validated against declared type
**File:** `src/lib/validations.ts`
- Added `isActive: z.boolean().optional()` field to `adminConfigSchema`
- Added `.refine()` that validates:
  - If type is `'number'`, value must parse as a valid number
  - If type is `'boolean'`, value must be `'true'` or `'false'`
- Error message: `'Valor no corresponde ao tipo declarado'` with path `['value']`

### BUG 5: Deposit method not validated against allowed values
**Files:** `src/lib/validations.ts`, `src/app/api/deposit/route.ts`
- Changed `depositSchema.method` from `z.string().min(1, ...)` to `z.enum(['pix', 'usdt_trc20', 'usdt_polygon'])`
- Updated txHash check in deposit route to require it for both `usdt_trc20` AND `usdt_polygon` (previously only `usdt_trc20`)

## Lint Result
Passed with no errors.
