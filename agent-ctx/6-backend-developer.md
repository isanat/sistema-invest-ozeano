# Task 6 - Backend Developer

## Task: Modify the withdrawal API to check voucher unlock conditions

### Changes Made

#### 1. Backend: `/src/app/api/withdraw/route.ts`
Added voucher withdrawal lock check between min/max amount validation and the transaction block:
- Queries active vouchers for the user via `db.voucher.findMany`
- Calculates the highest `withdrawalUnlockPct` across all active vouchers (most permissive)
- If `maxUnlockPct === 0`: Returns 400 error blocking all withdrawals
- If `maxUnlockPct < 100`: Fetches user balance and caps withdrawal to `balance * (maxUnlockPct / 100)`
- Also queries completed vouchers with 100% unlock (for reference, no restriction)

#### 2. Frontend: `/src/app/page.tsx`
- Added `withdrawVoucherInfo` state variable (type: `{ hasActiveVouchers: boolean; unlockPct: number; maxWithdrawable: number } | null`)
- Added voucher withdrawal warning card in the withdraw dialog, before the amount input
- Three visual states:
  - **Blocked (0% unlock)**: Red background, "⛔ Saques bloqueados"
  - **Partial (1-99% unlock)**: Amber background, shows max withdrawable amount
  - **Unlocked (100%)**: Emerald background, "✅ Saques desbloqueados"
- Uses `userVouchers` state (already existing) and `d()` helper to calculate unlock percentage

### Verification
- `bun run lint` — Clean pass, no errors
