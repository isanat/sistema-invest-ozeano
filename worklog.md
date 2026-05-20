---
Task ID: 1
Agent: Main
Task: Integrate real Bitget copy trading data into the platform

Work Log:
- Researched Bitget API endpoints for copy trading data (traderRankingList, traderSearch)
- Created /api/bitget/traders route with caching (5-min TTL), search, and ranking filters
- Added BitgetTrader interface and state to page.tsx
- Redesigned the Investir tab with real copy trader cards (ROI, PnL, AUM, drawdown, mini charts)
- Added search bar and ranking filters (ROI, PnL, Followers, Pro)
- Updated landing page traders section to show Bitget data with fallback to DB traders
- Added graceful fallback when Bitget API is unavailable (403 from cloud IPs)
- Updated invest dialog to work with both Bitget and DB traders
- Added new translation keys (ES/PT): realData, searchPlaceholder, filterROI, pnlLabel, aumLabel, drawdown, followers, bitgetUnavailable
- Changed sidebar label from "Invertir/Investir" to "Copy Trade"
- Verified nowpayments currency filtering is already working
- Verified admin role-based menu separation is already working
- Pushed to GitHub (fb4aeee)

Stage Summary:
- Bitget API integration complete - real trader data with search/filter
- Landing page shows real traders from Bitget when available
- Investir tab completely redesigned for copy trading UX
- Fallback mechanism when Bitget API is blocked
- All lint checks pass
