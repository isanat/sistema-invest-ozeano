---
Task ID: 1
Agent: Main Agent
Task: Fix deposit modal to properly respect admin settings — hide manual deposit when disabled, show only NowPayments-selected currencies without fallbacks

Work Log:
- Analyzed current deposit modal code in page.tsx and all related API routes
- Browsed mining-protocol repo for reference on how settings should control deposit options
- Found root cause #1: Site Config API had inconsistent boolean checks (`!== 'false'` vs `=== 'true'`), causing some settings to default to TRUE when key was missing
- Found root cause #2: Admin Config UI used plain `<Input>` for ALL config types including booleans — admin had to type "true"/"false" manually
- Found root cause #3: Deposit modal had hardcoded default currencies `['usdttrc20', 'usdtmatic', 'btc', 'eth', 'trx']` that showed even when NowPayments returned empty
- Found root cause #4: No `nowpayments_deposit_currencies` config key existed to let admin select specific currencies
- Found root cause #5: Server-side deposit APIs (deposit route, nowpayments deposit route) didn't validate admin settings
- Fixed site config API: all boolean checks now use strict `=== 'true'` (defaults to FALSE if key missing)
- Added `nowpayments_deposit_currencies` config key to DB, setup route, and admin UI
- Fixed admin config UI: boolean configs now render Switch components instead of text inputs
- Fixed deposit modal: removed hardcoded fallback currencies, respects admin-selected currencies only
- Fixed currencies API: admin-configured currencies take priority over API results
- Added server-side validation: deposit routes now check `manual_deposit_enabled`, `nowpayments_enabled`, `has_pix`, `has_usdt`, and `nowpayments_deposit_currencies`
- Fixed landing API to use boolean config flags instead of wallet address presence

Stage Summary:
- All deposit settings now use strict `=== 'true'` checks throughout the codebase
- Admin sees Switch toggles for boolean configs (Ativado/Desativado labels)
- Deposit modal only shows methods explicitly enabled by admin
- `nowpayments_deposit_currencies` config lets admin control which specific currencies appear
- Server-side validation prevents bypassing disabled deposit methods
- API response verified: hasPix=false, hasUsdt=true, manualDepositEnabled=false, nowpaymentsEnabled=true, nowpaymentsDepositCurrencies=["usdttrc20"]
