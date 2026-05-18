# Task 3 - NowPayments Service Library

**Agent**: Backend Developer  
**Status**: Completed  
**Date**: 2025-05-18

## Summary

Created `/home/z/my-project/src/lib/nowpayments.ts` — a comprehensive NowPayments API integration service library that wraps all v1 API endpoints needed for the mining platform's crypto payment processing.

## What was created

A single file `src/lib/nowpayments.ts` with the following modules:

1. **Configuration** - Environment variable based config (BASE_URL, API_KEY, IPN_SECRET, EMAIL, PASSWORD)
2. **JWT Token Management** - Auto-refresh with 5-min expiry and 30s buffer (`getJwtToken()`, `clearJwtToken()`)
3. **API Helper** - Generic `apiRequest()` with automatic JWT injection for protected endpoints
4. **Payment API** - `createPayment()`, `getPaymentStatus()`, `getMinimumPaymentAmount()`, `getEstimatedPrice()`
5. **Invoice API** - `createInvoice()`, `createInvoicePayment()` with typed `InvoiceResponse`
6. **Sub-Partner/Custody API** - 7 functions for per-user deposit accounts, transfers, and write-offs
7. **Payout API** - 6 functions for external wallet payouts including 2FA verification
8. **Balance API** - `getBalance()` for custody account balances
9. **Currency API** - 3 functions for querying supported/enabled currencies
10. **Webhook Verification** - HMAC-SHA512 with `crypto.timingSafeEqual()` (timing-attack safe)
11. **Status Helpers** - `isPaymentFinal()`, `isPaymentSuccessful()`, `isPayoutFinal()`
12. **Currency Mapping** - 10-currency map with bidirectional translation functions
13. **Config Check** - `isNowPaymentsConfigured()`, `getNowPaymentsConfig()`

## Key design decisions

- Used `unknown` return type for flexible API responses where the schema isn't fully known
- Used typed interfaces (`PaymentResponse`, `InvoiceResponse`, etc.) where the API schema is well-defined
- `sortObject()` uses `Record<string, unknown>` instead of `any` for better type safety
- Webhook verification allows unverified in development when IPN_SECRET is missing

## Verification

- `bun run lint` — Clean pass, no errors
- All exports are ready for consumption by API route handlers

## Dependencies on previous tasks

- Task 2 (Schema) created the Prisma models; this library will be used alongside those models in API routes
- Task 1 (SQLite Adapter) ensured the project compiles; this task maintains that status
