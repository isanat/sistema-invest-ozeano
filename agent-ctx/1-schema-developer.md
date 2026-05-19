# Task 1 - Schema Developer Work Record

## Task: Add Voucher and VoucherUsage models to Prisma schema

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)

#### Added `voucherBalance` field to User model
- Placed after `totalWithdrawn` field: `voucherBalance String @default("0") // USDT voucher balance (from active vouchers)`

#### Added `vouchers` relation to User model
- Added `vouchers Voucher[]` to the User model's relations section (after `nowpaymentsPayouts`)

#### Added `voucherUsages` relation to MiningRental model
- Added `voucherUsages VoucherUsage[]` to MiningRental (required because VoucherUsage has a foreign key to MiningRental)

#### Added Voucher model (end of file)
- Full model with: id, userId, amount, usedAmount, type, status
- Goal fields: goalDirectReferrals, goalMinReferralInvest, goalNetworkMultiple, goalDays
- Progress tracking: currentDirectReferrals, currentNetworkInvestment, qualifyingReferrals
- Gradual unlock: withdrawalUnlockPct
- Date fields: deadline, completedAt, lastProgressUpdate
- Admin tracking: createdBy, revokedBy, revokeReason, extendedDays, adminNotes
- Relations: user (User), usages (VoucherUsage[])
- Indexes: userId, status, userId+status

#### Added VoucherUsage model (end of file)
- Fields: id, voucherId, rentalId, amount, createdAt
- Relations: voucher (Voucher), rental (MiningRental)
- Indexes: voucherId, rentalId

### 2. Database Migration
- Temporarily switched provider to SQLite for local db:push (no PostgreSQL available locally)
- `bun run db:push` succeeded — all models synced
- Restored provider to PostgreSQL for production

## Verification
- Schema validates correctly
- db:push succeeded
- Prisma Client regenerated with new models
