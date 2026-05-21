# Task 4: Security & UX Bug Fixes

## Agent: Security & UX Fix Agent

## Summary
Fixed two bugs:
1. **Rate limiting on financial endpoints** — middleware now rate-limits `/api/withdraw`, `/api/investments` (POST), `/api/affiliate/withdraw`, `/api/vouchers/use`, `/api/nowpayments/deposit` at 10 req/min/IP
2. **Loading skeletons for affiliate/voucher sections** — added `animate-pulse` skeleton placeholders for 5 key data-loading areas

## Files Changed
- `src/middleware.ts` — Added financial rate limiting constants, route list, and rate-limit check block
- `src/app/page.tsx` — Added `affiliateLoading`, `userVouchersLoading` states and skeleton UI components

## Key Decisions
- Financial rate limit (10/min) is more lenient than auth (5/min for register) since legitimate users may make several financial operations
- `/api/investments` only rate-limits POST to avoid throttling GET (list) requests
- Distinct error messages for financial vs auth rate limits
- Skeletons use `bg-zinc-700/50 animate-pulse` matching the dark theme
- Existing `dataLoading` and `adminLoading` states were declared but unused in rendering — now `adminLoading` is used for admin section skeletons
