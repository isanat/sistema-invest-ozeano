# Task 1-5: Dynamic Marketing Section - Work Record

## Summary
Successfully replaced all hardcoded values in the marketing section of the admin panel with dynamic data from the database. The user explicitly requested "precisa pegar os dados dinamicamente do banco de dados, nada pode ser hardcoded ou fallbacks".

## Changes Made

### 1. Added 3 missing config keys to route files
- **`/home/z/my-project/src/app/api/admin/migrate-config/route.ts`**
  - Added `default_profit_share_pct` (value: '70', category: 'trading')
  - Added `mining_variance_pct` (value: '5', category: 'trading')
  - Added `system_min_reserve` (value: '15', category: 'general')

- **`/home/z/my-project/src/app/api/admin/reset-seed/route.ts`**
  - Added same 3 keys in the same categories

- **`/home/z/my-project/src/app/api/admin/setup/route.ts`**
  - Added same 3 keys in the same categories

### 2. Added helper functions before main component
- **`getCfgVal(configs, key)`** — Helper to look up config value by key from SystemConfig array
- **`generateWhatsAppText(data)`** — Generates WhatsApp promotional text dynamically from:
  - siteName, plans, profitSharePct, affiliateLevels, ranks, minDepositUsdt, dailyRoiPct
  - Groups consecutive affiliate levels with same percentage
  - Builds example calculations from actual L1/L2 percentages

### 3. Added `whatsappText` useMemo inside component
- Computed from `adminConfigs`, `adminPlans`, `affiliateLevels`, `adminRanks`, `siteConfig.siteName`
- Uses `getCfgVal()` to extract config values
- Uses `d()` to parse string values to numbers
- Filters active plans, active ranks

### 4. Updated marketing section in page.tsx
- **WhatsApp copy button**: Replaced hardcoded string with `whatsappText`
- **WhatsApp share button**: Replaced hardcoded `encodeURIComponent()` string with `whatsappText`
- **WhatsApp display area**: Replaced hardcoded template literal with `{whatsappText}`
- **Affiliate levels fallback**: Removed hardcoded 11-level fallback array; now shows "Nenhum nível de afiliado configurado" when empty
- **Key System Configs**: Removed hardcoded fallbacks (`70%` for `default_profit_share_pct`, `5%` for `mining_variance_pct`)
- **Sustainability section**: 
  - Reserva mínima: Now uses `getCfgVal(adminConfigs, 'system_min_reserve')`
  - Profundidade máxima: Now uses `affiliateLevels.filter(l => l.isActive).length`
  - Variação de ROI: Now uses `getCfgVal(adminConfigs, 'mining_variance_pct')`
  - Fixed Spanish text to Portuguese: "Qualificação obrigatória: investidor + link desbloqueado para receber comissões"

### 5. Verification
- `useMemo` already imported from React (line 3)
- Lint passes cleanly
- Dev server runs without errors
