# Task 2 - API Developer

## Summary
Created 5 API routes for the Voucher system covering admin CRUD operations, user-facing voucher data, progress recalculation, and voucher balance usage for rentals.

## Files Created

### 1. `/src/app/api/admin/vouchers/route.ts` (GET + POST)
- **GET**: Lists all vouchers with user info (name, email), filterable by `?status=`, includes progress calculations (referralProgress, networkProgress, goalCompletionPct, availableBalance)
- **POST**: Creates new voucher with type-based defaults:
  - `basic`: 500 USDT, 5 referrals, 100 min invest, 3x network, 30 days
  - `premium`: 2000 USDT, 10 referrals, 200 min invest, 5x network, 45 days
  - `custom`: Admin defines all parameters
  - Atomically adds voucherBalance to user via raw SQL `UPDATE "User" SET "voucherBalance" = (CAST("voucherBalance" AS NUMERIC) + amount)::text`
  - Creates admin log

### 2. `/src/app/api/admin/vouchers/[id]/route.ts` (PATCH + DELETE)
- **PATCH** with 3 actions:
  - `revoke`: Sets status=revoked, subtracts remaining balance from user voucherBalance
  - `extend`: Adds extendDays to deadline, increments extendedDays
  - `complete`: Force completes, sets withdrawalUnlockPct='100', completedAt=now
- **DELETE**: Only for active/expired vouchers. Subtracts remaining balance, deletes usages, deletes voucher.

### 3. `/src/app/api/vouchers/route.ts` (GET)
- Returns user's vouchers with usages and rental details
- Includes progress calculations, isExpired flag, daysRemaining

### 4. `/src/app/api/vouchers/progress/route.ts` (POST)
- Recalculates progress for all active vouchers
- Uses raw SQL for efficiency: counts direct referrals, qualifying referrals (invested >= goalMinReferralInvest), total network investment
- **4-tier gradual withdrawal unlock**:
  - Tier 1 (25%): qualifyingReferrals >= 50% of goal
  - Tier 2 (50%): qualifyingReferrals >= 75% of goal AND network >= 50% of target
  - Tier 3 (75%): qualifyingReferrals >= 100% of goal AND network >= 75% of target
  - Tier 4 (100%): All goals met
- Auto-completes vouchers when all goals met
- Auto-expires when deadline passes (deducts remaining balance)

### 5. `/src/app/api/vouchers/use/route.ts` (POST)
- Uses voucher balance to pay for a rental
- Full validation: voucher ownership, active status, sufficient balance, rental ownership, amount match, no duplicate usage
- Atomic transaction with row lock (FOR UPDATE)
- Creates Transaction record for payment history

## Design Decisions
- All raw SQL uses PostgreSQL-compatible syntax (CAST AS NUMERIC, )::text, FOR UPDATE)
- Voucher type defaults stored in const object for easy maintenance
- Custom type requires admin to provide all goal parameters (validated with error messages)
- Progress recalculation is per-voucher to allow different goalMinReferralInvest per voucher
- Balance deduction uses atomic raw SQL with re-verification pattern (same as rentals/withdraw)
- Admin logs created for all admin actions (create, revoke, extend, complete, delete)
