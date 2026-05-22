# Task med-batch-3: Medium Bug Fixes Summary

## All 5 bugs fixed successfully. Lint passes with no errors.

### BUG 1: Reset-seed atomicity
- **File**: `src/app/api/admin/reset-seed/route.ts`
- **Fix**: Wrapped all deleteMany + updateMany + createMany operations in a single `db.$transaction(async (tx) => { ... }, { timeout: 60000 })`. All `db.` calls replaced with `tx.` inside the transaction block. Hardcoded seeded counts in the return statement since variables are now scoped inside the transaction closure.

### BUG 2: Admin bulk config update atomicity
- **File**: `src/app/api/admin/config/route.ts`
- **Fix**: Wrapped the PUT handler's for loop in `db.$transaction(async (tx) => { ... })`. All `db.systemConfig` and `db.adminLog` calls replaced with `tx.systemConfig` and `tx.adminLog`. The results array is now returned from the transaction.

### BUG 3: Withdrawal stats missing 'completed' status
- **File**: `src/app/api/admin/stats/route.ts`
- **Fix**: Changed the withdrawal SQL query's `confirmed_amount` CASE clause from `WHEN status = 'confirmed'` to `WHEN status IN ('confirmed', 'completed')` so that withdrawals in the 'completed' state are also counted.

### BUG 4: Registration race condition returns 500
- **File**: `src/app/api/auth/register/route.ts`
- **Fix**: Added P2002 error code handling in the catch block. When Prisma throws a unique constraint violation for the email field, it now returns a 409 Conflict with message "Email já cadastrado no sistema" instead of a 500 error.

### BUG 5: Milestone claim not atomic
- **File**: `src/app/api/affiliate/route.ts`
- **Fix**: Wrapped the milestone claim create + balance update + transaction record create in a single `db.$transaction(async (tx) => { ... })`. All `db.` calls inside replaced with `tx.`. If the balance update or transaction record fails, the claim create is also rolled back, preventing orphaned claims.
