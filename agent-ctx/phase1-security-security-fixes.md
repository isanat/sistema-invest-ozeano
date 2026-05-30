# Phase 1 Security Fixes — Work Record

**Task ID:** phase1-security  
**Agent:** Security Fixes Agent

---

## Summary of All Changes

### Fix #1: Duplicate User Update Route — VERIFIED & ENHANCED
**File:** `src/app/api/admin/users/[id]/route.ts`

**Status:** Already had proper zod validation, transaction with row locking, Transaction records, AdminLog, PIN verification, and guards from prior work (task ID 1-5). 

**Enhancement in this task:** Moved AdminLog creation INSIDE the transaction (for atomicity with balance adjustment Transactions), added `referenceId: adminLog.id` to all Transaction records, updated import from `getIpFromRequest` to `getClientIp`.

### Fix #2: Add IP Address to All AdminLogs
**File:** `src/lib/api-utils.ts`

**Changes:**
- Renamed `getIpFromRequest()` to `getClientIp()` (the name specified in the task requirements)
- Added backward-compatible alias: `export const getIpFromRequest = getClientIp` with `@deprecated` JSDoc
- All existing `getIpFromRequest(request)` calls throughout the codebase continue to work

**File:** `src/app/api/admin/fix-referrals/route.ts`

**Critical Fix:** Two `adminLog.create()` calls were **missing `adminId`** (lines 131 and 212). This means audit logs for referral fixes had NO traceability to which admin performed the action. Fixed by:
- Changed `await requireAdmin()` → `const session = await requireAdmin()` in both POST and PUT handlers
- Added `adminId: session.userId` to both adminLog.create calls
- Updated import from `getIpFromRequest` to `getClientIp`

### Fix #3: Add AdminLog to All Unlogged Admin Endpoints
**File:** `src/app/api/admin/migrate/route.ts`

**Changes:** This endpoint had NO admin logging at all. Added:
- `const session = await requireAdmin()` (was previously `await requireAdmin()` without capturing session)
- `import { db } from '@/lib/db'` and `import { getClientIp } from '@/lib/api-utils'`
- Full adminLog.create() with: adminId, action 'migrate', entity 'system', description, newValue, ipAddress
- Refactored to capture result before logging, then return

**Verified all other listed endpoints already have admin logging:**
- `admin/users/[id]/route.ts` ✓
- `admin/trading-pools/[id]/route.ts` ✓
- `admin/withdrawals/[id]/route.ts` ✓
- `admin/affiliate-levels/route.ts` ✓
- `admin/copy-traders/route.ts` ✓
- `admin/copy-traders/[id]/route.ts` ✓
- `admin/investment-plans/route.ts` ✓
- `admin/investment-plans/[id]/route.ts` ✓
- `admin/affiliate-badges/route.ts` ✓
- `admin/affiliate-ranks/[id]/route.ts` ✓
- `admin/force-release-lock/route.ts` ✓

### Fix #4: Fix Weak requireAdmin in api-utils — VERIFIED ALREADY FIXED
**File:** `src/lib/api-utils.ts`

**Status:** Already fixed in prior work. The `requireAdmin(request)` function at lines 90-104 does:
1. Verify JWT token from cookie
2. Check role from payload (`admin` or `super_admin`)
3. **Re-verify role from database** via `db.user.findUnique()` to prevent stale JWT privilege escalation
4. Same pattern for `requireSuperAdmin(request)`

No changes needed.

### Fix #5: Fix JWT Fallback Secret — VERIFIED ALREADY FIXED
**File:** `src/lib/auth.ts`

**Status:** Already fixed in prior work. Lines 9-22:
- In production (`NODE_ENV === 'production'`) with no `NEXT_PHASE=phase-production-build`: **throws a fatal error** refusing to start
- Only allows fallback in development
- Includes `NEXT_PHASE` exception for build-time (server isn't running, so fallback is safe)

No changes needed.

### Fix #6: Fix Setup GET Endpoint Exposure — VERIFIED ALREADY FIXED
**File:** `src/app/api/admin/setup/route.ts`

**Status:** Already fixed in prior work. Lines 10-13:
- GET handler calls `requireAdmin(request)` which does DB-reverified admin check
- Returns 401 if not authenticated admin
- No system state leaked to unauthenticated users

No changes needed.

### Fix #7: Fix Debug Endpoint — MOVED TO /api/admin/ PATH
**Files:**
- `src/app/api/nowpayments/debug/route.ts` — Replaced with 410 Gone response pointing to new location
- `src/app/api/admin/nowpayments-debug/route.ts` — NEW FILE

**Changes:**
- Moved the debug endpoint from `/api/nowpayments/debug` (not under admin path) to `/api/admin/nowpayments-debug`
- Simplified auth: uses `requireAdmin()` from `@/lib/auth` (session-based with DB re-verification) — removed redundant double-check
- Added admin audit logging for debug access
- Old endpoint returns 410 Gone with redirect info (no frontend code referenced the old path)

### Fix #8: Add Transaction ReferenceId for Balance Adjustments
**Files:**
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`

**Changes in both files:**
- Moved `AdminLog.create()` INSIDE the `db.$transaction()` block (before Transaction records) so it's atomic
- Captured `const adminLog = await tx.adminLog.create(...)` to get the log's ID
- Added `referenceId: adminLog.id` to all three Transaction records (balance, affiliateBalance, voucherBalance adjustments)
- Updated import from `getIpFromRequest` to `getClientIp`
- Extracted `const ipAddress = getClientIp(request)` before the transaction for use inside it

This creates a proper audit trail: each balance adjustment Transaction now links back to the specific AdminLog entry that caused it.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/api-utils.ts` | Renamed `getIpFromRequest` → `getClientIp`, added backward-compat alias |
| `src/app/api/admin/fix-referrals/route.ts` | Added missing `adminId` to 2 adminLog.create calls, updated import |
| `src/app/api/admin/migrate/route.ts` | Added full admin audit logging, captured session |
| `src/app/api/admin/users/route.ts` | Moved AdminLog inside tx, added referenceId to Transaction records |
| `src/app/api/admin/users/[id]/route.ts` | Moved AdminLog inside tx, added referenceId to Transaction records |
| `src/app/api/nowpayments/debug/route.ts` | Replaced with 410 Gone redirect |
| `src/app/api/admin/nowpayments-debug/route.ts` | NEW: moved debug endpoint under admin path with audit log |

## Lint Results
- `bun run lint` passes with only pre-existing errors in `set-env.js` (not related to these changes)
- Dev server compiles and runs successfully with no TypeScript errors
