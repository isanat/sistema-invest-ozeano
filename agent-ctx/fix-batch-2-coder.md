# Task fix-batch-2: Bug Fixes Summary

## All 5 bugs fixed successfully. Lint passes clean.

### BUG 6: Advisory lock not released on early return in cron
**File:** `src/app/api/cron/distribute/route.ts`
**Changes:**
1. Changed lock acquisition failure from `console.warn` + proceed → `return apiError(..., 423)` (abort instead of proceeding)
2. Wrapped all code after lock acquisition in a `try { ... } finally { ... }` block
3. Moved lock release (`pg_advisory_unlock(12345)`) into the `finally` block so it **always** runs, even on early returns or exceptions
4. Removed the `lockReleased` variable (no longer needed with finally pattern)
5. Removed duplicate lock release from the outer catch block (finally handles it)

### BUG 7: Double deposit approval (race condition)
**File:** `src/app/api/admin/deposits/route.ts`
**Changes:**
1. Added `SELECT ... FOR UPDATE` row lock on the Deposit row at the start of the approve transaction
2. Added re-check of status from the locked row (`lockedDeposit[0].status !== 'pending'`) to prevent two concurrent admin requests from both passing the status check
3. Removed `hasInvested = true` from the deposit approval flow — depositing is NOT investing, so this flag should not be set here

### BUG 8: Admin can demote themselves or last admin → system lockout
**File:** `src/app/api/admin/users/route.ts`
**Changes:**
1. Added guard: admin cannot change their own role (`id === session.userId && data.role !== 'admin'`)
2. Added guard: cannot demote the last admin — checks `adminCount <= 1` before allowing a role change away from 'admin'

### BUG 9: NowPayments deposit not updated on failed payment
**File:** `src/app/api/nowpayments/webhook/route.ts`
**Changes:**
1. Added `db.nowPaymentsDeposit.update()` call after the `if (deposit.depositId)` block in the failed/expired/refunded payment handler, ensuring the `updateData` object (with paymentStatus, updatedAt, etc.) is actually persisted to the `NowPaymentsDeposit` record

### BUG 10: Admin withdrawal approve uses non-atomic totalWithdrawn update
**File:** `src/app/api/admin/withdrawals/route.ts`
**Changes:**
1. Replaced `findUnique` + `update` pattern (read-then-write, subject to race condition) with a single atomic raw SQL: `UPDATE "User" SET "totalWithdrawn" = (CAST("totalWithdrawn" AS NUMERIC) + ${d(deposit.amount)})::text WHERE id = ${deposit.userId}`
