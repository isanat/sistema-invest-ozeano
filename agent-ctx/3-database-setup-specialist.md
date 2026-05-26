# Task 3 - SQLite Local Dev Setup & Database Seeding

**Agent**: Database Setup Specialist  
**Task ID**: 3  
**Date**: 2026-05-19  
**Status**: Completed

## Summary
Switched Prisma schema from PostgreSQL to SQLite for local development, seeded the database, and verified all key APIs.

## Key Deliverables
- Prisma schema switched to SQLite with env("DATABASE_URL")
- All 15 files with PostgreSQL raw SQL converted to SQLite
- Investment model expanded with missing fields (type, method, network, txHash, etc.)
- voucherBalance added to User model
- investmentId added to NowPaymentsDeposit/NowPaymentsPayout
- Seed script created at prisma/seed.ts
- Database seeded and APIs verified working

## Credentials
- Admin: admin@plataformaroi.com / Admin@2026!
- User: user@test.com / User@2026!

## NowPayments Status
- All 7 routes fully implemented (not stubs)
- Graceful degradation: works without NowPayments API key
- Supports both env vars and SystemConfig database for credentials
- Needs NOWPAYMENTS_API_KEY, EMAIL, PASSWORD, IPN_SECRET to function

## Hardcoded Data Found
- Crypto prices (BTC, ETH, SOL, BNB) - static, not from API
- Trading signals - static mock data
- WhatsApp share text has plan/affiliate percentages that may mismatch with DB
