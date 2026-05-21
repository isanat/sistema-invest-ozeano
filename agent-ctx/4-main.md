# Task 4 - Update Deposit Dialog to Fetch Currencies Dynamically

## Summary
Updated the deposit dialog in `/home/z/my-project/src/app/page.tsx` to fetch currencies dynamically from the NowPayments API (`/api/nowpayments/currencies`) instead of using hardcoded currency options.

## Changes Made

### 1. New State Variables (line ~522-523)
- `npCurrencies` - stores the list of currency objects from the API
- `npCurrenciesLoading` - boolean flag for loading state

### 2. New Function: `fetchNpCurrencies` (line ~1147-1178)
- Calls `/api/nowpayments/currencies` API route
- On success: populates `npCurrencies` and sets default currency to USDT TRC20 (or first available)
- On empty/error: falls back to hardcoded list of 4 currencies (USDT TRC20, USDT Polygon, BTC, ETH)

### 3. New useEffect (line ~786-791)
- Triggers `fetchNpCurrencies()` when `depositDialog` becomes true and user is authenticated

### 4. Dynamic Currency Select (line ~6254-6275)
- Replaced hardcoded `<SelectItem>` values with dynamic rendering from `npCurrencies`
- Shows "Carregando..." in trigger while loading
- Shows warning message when no currencies available

### 5. Dynamic Minimum Amount Hint (line ~6252)
- Now shows currency-specific `minDeposit` from API data
- Falls back to "20 USDT" when no specific minimum is available

## Verification
- ESLint passes with no errors
- API route `/api/nowpayments/currencies` already exists and returns expected format
- Fallback mechanism ensures deposit dialog always has currency options even if API fails
