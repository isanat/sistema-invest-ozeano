# Phase 2 PIN — Security PIN System Implementation

## Task ID: phase2-pin
## Agent: PIN Security Agent
## Status: COMPLETED

## Summary
Implemented a comprehensive Security PIN system for admin sensitive actions, including PIN storage on User model, enhanced validation, rate-limited PIN middleware, admin invite system, and super_admin role support.

## Files Created

### 1. `src/lib/admin-pin-middleware.ts` (NEW)
- `verifyPinForAction(request, action)` — Rate-limited PIN verification middleware
- Reads PIN from `x-admin-pin` header
- In-memory rate limiting: 5 attempts, 15 min lockout
- Checks `User.securityPin` first, falls back to `AdminPin` table
- Returns `{ success, adminId, error? }` for easy integration

### 2. `src/app/api/admin/invites/route.ts` (NEW)
- `GET` — List all invites (admin+)
- `POST` — Create invite (super_admin only, requires PIN)
  - Validates email uniqueness
  - Generates secure token (crypto.randomBytes(32))
  - 7-day expiry
  - Creates AdminLog entry

### 3. `src/app/api/admin/invites/[id]/route.ts` (NEW)
- `PUT` — Approve/reject invite (super_admin only, requires PIN)
  - Updates user role when approved after registration
  - Creates AdminLog entry
- `DELETE` — Delete invite (super_admin only)

### 4. `src/app/api/admin/invites/register/route.ts` (NEW)
- `POST` — Register via invite link (PUBLIC, requires valid token)
  - Validates invite token, email match, expiration
  - Enhanced PIN validation (6 digits, no sequential, no repeated)
  - Creates user with `role: 'user'` and `isActive: false` (pending approval)
  - Sets `User.securityPin` and creates `AdminPin` record
  - Updates invite status to 'registered'

### 5. `src/app/api/admin/invites/validate/route.ts` (NEW)
- `GET` — Validate invite token (PUBLIC)
  - Returns `{ valid, email, name?, expired? }`

## Files Modified

### 1. `prisma/schema.prisma`
- Added `securityPin String?` and `securityPinSetAt DateTime?` to User model
- Added `AdminInvite` model (id, email, token, invitedBy, name, role, status, expiresAt, usedAt)
- Added `adminInvites AdminInvite[] @relation("AdminInvites")` to User model
- Ran `bun run db:push` — schema applied successfully

### 2. `src/lib/admin-pin.ts`
- Added `hashPin()` with PIN_SALT_ROUNDS=12
- Added `verifyPin()` using bcryptjs compare
- Added `validatePinFormat()` with enhanced validation:
  - Exactly 6 digits
  - No sequential digits (123456, 654321, etc.)
  - No repeated digits (111111, 222222, etc.)
- Added `getAdminPinStatus()` — returns hasPin + setAt
- Added `getAdminPinHash()` — gets hash from User.securityPin or AdminPin
- Updated `adminHasPin()` and `verifyAdminPin()` to check User.securityPin first, then AdminPin table
- Added `PIN_REQUIRED_ACTIONS` const array with 9 action types
- Added `PinRequiredAction` type
- Added `getPinActionForUserUpdate()` — determines whether action is 'role_change' or 'balance_change'
- Kept backward-compat `isValidPinFormat()` and `requiresPinVerification()`

### 3. `src/app/api/admin/pin/setup/route.ts`
- Updated to use `User.securityPin` + `securityPinSetAt` (primary storage)
- Also updates `AdminPin` table for backward compatibility
- Added `currentPin` verification when changing existing PIN
- Uses enhanced `validatePinFormat()` (sequential/repeated digit detection)
- Better error messages

### 4. `src/app/api/admin/pin/verify/route.ts`
- Added in-memory rate limiting (5 attempts, 15 min lockout)
- Returns `{ valid, hasPin, attemptsLeft? }`
- Uses `adminHasPin()` and `verifyAdminPin()` from admin-pin.ts

### 5. `src/app/api/admin/pin/status/route.ts`
- Uses `getAdminPinStatus()` to return `{ hasPin, setAt }`

### 6. `src/app/api/admin/users/route.ts`
- Added `verifyPinForAction()` integration via `x-admin-pin` header
- Falls back to body `pin` for backward compatibility
- Uses `getPinActionForUserUpdate()` for action-specific logging
- Added `hasPin` flag in user listing (checks `securityPinSetAt` or `adminPin`)
- Shows `securityPinSetAt` in user data

### 7. `src/app/api/admin/users/[id]/route.ts`
- Same PIN integration as users/route.ts
- Supports both `x-admin-pin` header and body `pin`

### 8. `src/app/api/admin/withdrawals/[id]/route.ts`
- Added PIN requirement for approve/reject actions
- Maps action to correct `PinRequiredAction` type
- Supports both `x-admin-pin` header and body `pin`

### 9. `src/app/api/admin/reset-seed/route.ts`
- Added PIN requirement via `verifyPinForAction(request, 'reset_seed')`
- Supports both `x-admin-pin` header and body `pin`

### 10. `src/app/api/admin/migrate/route.ts`
- Added PIN requirement via `verifyPinForAction(request, 'migrate_db')`
- Supports both `x-admin-pin` header and body `pin`
- Reads body with `.catch(() => ({}))` to handle JSON parse errors

### 11. `src/app/api/admin/force-release-lock/route.ts`
- Added PIN requirement via `verifyPinForAction(request, 'force_release')`
- Supports both `x-admin-pin` header and body `pin`

### 12. `src/middleware.ts`
- Fixed admin role check: `payload.role !== 'admin'` → `payload.role !== 'admin' && payload.role !== 'super_admin'`
- Added public routes: `/api/admin/invites/register` and `/api/admin/invites/validate`

## Architecture Decisions

1. **Dual PIN storage**: `User.securityPin` is the primary storage, but `AdminPin` table is kept in sync for backward compatibility with existing code.

2. **Header-based PIN**: New `x-admin-pin` header approach for API routes allows cleaner separation of PIN from business data. Body `pin` still works for backward compatibility.

3. **Rate limiting**: In-memory maps for PIN attempt tracking (per admin, per verification endpoint). Lockout after 5 failed attempts for 15 minutes.

4. **AdminInvite vs AdminInvitation**: `AdminInvite` is the new model for the PIN-protected invite flow with registration + approval stages. `AdminInvitation` remains for the existing invitation system.

5. **Public register/validate routes**: Invite registration and token validation are public endpoints (no session required) but require a valid invite token.

## Lint Results
- All new/modified files pass ESLint with zero errors
- Only pre-existing `set-env.js` errors remain (not related to this task)
- Dev server running successfully on port 3000
