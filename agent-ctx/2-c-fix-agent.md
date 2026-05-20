# Task 2-c: Fix multiple API route bugs

## Agent: Fix Agent

## Summary
Fixed 3 API route bugs identified in the 2-a and 2-b audit reports.

## Changes Made

### Fix 1: Double requireAuth in nowpayments/status
- **File**: `src/app/api/nowpayments/status/route.ts`
- **Change**: Removed duplicate `await requireAuth();` call, keeping only `const session = await requireAuth();`
- **Impact**: Eliminates redundant JWT verification per request

### Fix 2: Missing PUT/DELETE + auth import in admin trading-pools
- **File**: `src/app/api/admin/trading-pools/route.ts`
- **Changes**:
  - Import `requireAdmin` from `@/lib/auth` instead of `@/lib/api-utils` (consistent with other admin routes)
  - Updated GET/POST to use `requireAdmin()` that throws (no null check needed)
  - Added PUT handler with explicit field mapping + admin log
  - Added DELETE handler (soft delete: status='inactive') + admin log

### Fix 3: Arbitrary field injection in affiliate-badges PUT
- **File**: `src/app/api/admin/affiliate-badges/route.ts`
- **Change**: Replaced `data: updates` with explicit allowlist of 11 fields
- **Impact**: Prevents malicious clients from injecting arbitrary Prisma fields

## Verification
- `bun run lint` passes with no errors
