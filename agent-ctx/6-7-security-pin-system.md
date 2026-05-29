# Task 6-7: Security PIN System - Phase 2

## Summary
Implemented a comprehensive security PIN system for admin sensitive actions, plus a super_admin role for the platform.

## Changes Made

### 1. Database Model Changes
- Added `AdminPin` model to `prisma/schema.prisma` with fields: id, userId (unique), pinHash, createdAt, updatedAt
- Added `adminPin AdminPin?` relation to User model
- Updated User model role comment to include 'super_admin': `role String @default("user") // user, admin, super_admin`
- Ran `bun run db:push` to sync database

### 2. PIN Utility Functions (`src/lib/admin-pin.ts`)
- `hashPin(pin)` — bcrypt hash with 10 rounds
- `verifyPin(pin, hash)` — bcrypt compare
- `isValidPinFormat(pin)` — regex check for exactly 6 digits
- `adminHasPin(userId)` — check if admin has PIN set
- `verifyAdminPin(userId, pin)` — verify PIN by userId (returns false if no PIN set)
- `PIN_REQUIRED_FIELDS` — constant list of sensitive fields (balance, affiliateBalance, voucherBalance, totalInvested, totalRoi, totalWithdrawn, totalAffiliateEarnings, role)
- `requiresPinVerification(updateData, existingData)` — checks if any sensitive fields are being changed

### 3. PIN API Endpoints
- **POST `/api/admin/pin/setup`** — Create or update admin PIN. Validates 6-digit format, confirms match, upserts AdminPin record, creates AdminLog entry.
- **POST `/api/admin/pin/verify`** — Verify admin PIN. Returns `{ verified: true/false }`. Logs both successful and failed verification attempts.
- **GET `/api/admin/pin/status`** — Check if admin has PIN set. Returns `{ hasPin: boolean }`.

### 4. Updated Admin Routes to Require PIN
- **`/api/admin/users/route.ts` (PUT)** — Extracts `pin` from body; if sensitive fields are changing, requires PIN verification; returns 403 if PIN missing or invalid
- **`/api/admin/users/[id]/route.ts` (PUT)** — Same PIN requirement for balance/role changes
- **`/api/admin/withdrawals/route.ts` (PUT)** — Requires PIN for all approve/reject/complete actions
- **`/api/admin/reset-seed/route.ts` (POST)** — Now requires `requireSuperAdmin()` AND PIN verification; only super_admin can reset system data
- **`/api/auth/login-as/route.ts` (POST)** — Requires PIN for impersonation

### 5. Super Admin Role
- **`requireAdmin()`** updated in both `src/lib/auth.ts` and `src/lib/api-utils.ts` to accept both 'admin' and 'super_admin'
- **`requireSuperAdmin()`** added in both files — only accepts 'super_admin' role
- **Admin setup route** (`/api/admin/setup`) creates initial admin with `role: 'super_admin'`
- **`adminUserUpdateSchema`** updated to include 'super_admin' in role enum
- **Admin count queries** updated to use `role: { in: ['admin', 'super_admin'] }` everywhere
- **Last-admin guard** updated to protect both admin and super_admin from demotion
- **Role authorization checks** in payments/investments routes updated to accept super_admin

### 6. Front-end PIN Modal (page.tsx)
- Added PIN modal state variables: pinModalOpen, pinCallback, pinLoading, pinError, pinDigits, adminHasPin, pinSetupOpen, pinSetupPin, pinSetupConfirm, pinSetupLoading
- `requestPin()` — Promise-based function that opens PIN modal, returns PIN string when verified; auto-prompts PIN setup if admin has no PIN
- `handlePinSubmit()` — Verifies PIN with server, resolves promise, closes modal
- `handlePinSetup()` — Creates/updates PIN via API
- **PIN Verification Modal** — 6 individual digit inputs (OTP-style), auto-focus next on entry, backspace handler, Enter to submit
- **PIN Setup Dialog** — New PIN + confirm PIN fields, validation, calls setup API
- **PIN status check** — useEffect checks `/api/admin/pin/status` on admin panel load
- **Admin overview** — Shows amber warning card if PIN not configured, green "PIN ativo" card if configured, with "Configurar PIN" / "Alterar PIN" buttons
- **User update form** — Detects if sensitive fields changed, requests PIN via modal before submitting
- **Withdrawal actions** — Requests PIN before approving/rejecting/completing withdrawals
- **Login-as buttons** — Both in user list table and user edit dialog request PIN before impersonation
- **Role select** — Added "Super Admin" option in user edit dialog
- **Role badges** — Super Admin shown with red badge, Admin with amber badge
- **Role display** — Profile section shows "Super Admin" for super_admin users
- **All `role === 'admin'` checks** in frontend updated to also accept 'super_admin'

### 7. Other Updated Files
- `/api/auth/change-password/route.ts` — Admin log check updated for super_admin
- `/api/payments/status/[id]/route.ts` — Authorization check updated for super_admin
- `/api/investments/[id]/route.ts` — Authorization check updated for super_admin
- `/api/admin/restore-uico/route.ts` — Admin count and creation updated for super_admin

## Lint Results
Only pre-existing `set-env.js` errors (2 require-import warnings). All new code passes lint.
