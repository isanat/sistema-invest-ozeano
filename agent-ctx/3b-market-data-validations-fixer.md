# Task 3b - Fix market-data.ts, validations.ts, and API routes

## Summary
Removed hardcoded/mock data from market-data.ts, translated all Zod validation messages from Portuguese to Spanish, and rebranded "Mining Protocol"/"Ozeano Invest" references to "PLATAFORMA ROI" across API routes.

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/market-data.ts` | Removed mock getTradingStats() data, added getGlobalMarketData() for CoinGecko global API, fallbacks use 'N/A' instead of hardcoded values |
| `src/lib/validations.ts` | All 12 Zod error messages changed from Portuguese to Spanish |
| `src/app/api/landing/route.ts` | Default site name: 'Ozeano Invest' → 'PLATAFORMA ROI' |
| `src/app/api/admin/setup/route.ts` | Site name → 'PLATAFORMA ROI', Portuguese text → Spanish, mining references → copy trading |
| `src/app/api/crypto/stats/route.ts` | Now queries real DB data and passes to getTradingStats() |
| `src/app/layout.tsx` | Metadata: 'Mining Protocol' → 'PLATAFORMA ROI', keywords updated to copy trading |
| `src/app/api/nowpayments/withdraw/route.ts` | Payout descriptions: 'Mining Protocol' → 'PLATAFORMA ROI' |

## Key Decisions
- getTradingStats() is now synchronous (not async) since it just formats provided data
- Returns `null` when no dbData is provided instead of fake numbers
- CoinGecko /api/v3/global endpoint used for real-time marketCap and btcDominance
- Affiliate rank names changed from Portuguese (Prata, Ouro) to English (Silver, Gold)
- Admin email stays admin@ozeano.com as specified

## Verification
- `bun run lint` — clean pass
- Dev server returns 200 on GET /
- Note: /api/landing returns 500 due to PostgreSQL not being available in dev environment (pre-existing issue)
