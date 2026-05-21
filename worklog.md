---
Task ID: 1
Agent: Main
Task: Reset database and repopulate with plans, badges, ranks, etc. Also fix 500 error on investments.

Work Log:
- Read Prisma schema to understand all models and relationships
- Created POST /api/admin/reset-seed endpoint that:
  - Deletes all dependent data in correct FK order (investments, deposits, transactions, vouchers, etc.)
  - Resets user balances to 0 but keeps user records (names, emails, passwords)
  - Restores admin user hasInvested=true, linkUnlocked=true
  - Seeds: 32 SystemConfig, 11 Affiliate Levels, 5 Investment Plans, 3 Affiliate Ranks, 8 Badges, 3 Milestones, 4 Copy Traders, 3 Trading Pools
  - Requires admin auth and { confirm: true } body
- Fixed root cause of 500 error on POST /api/investments:
  - Added BusinessError class to api-utils.ts (returns 400 instead of 500)
  - Updated investment, withdraw, affiliate/withdraw, vouchers/use routes to use BusinessError
  - Also fixed linkUnlocked not being set when user invests
- Committed and pushed to main branch (beb5c50)

Stage Summary:
- New endpoint: POST /api/admin/reset-seed
- BusinessError class added for proper HTTP status on business logic errors
- All routes updated to use BusinessError for validation errors
- Need to call reset-seed endpoint on production after Vercel deploy
