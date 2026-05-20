---
Task ID: 2
Agent: Main Agent
Task: Compare and improve admin config UI to match mining-protocol repo quality

Work Log:
- Browsed mining-protocol repo to analyze its admin config UI pattern
- Found the key difference: mining-protocol uses CONFIG_LABELS constant with label, description, type, unit, options for each config key
- Our project was showing raw key names like "has_pix", "manual_deposit_enabled" — very ugly
- Added CONFIG_LABELS constant with 30+ config keys covering all categories (general, deposit, withdrawal, trading, affiliate, nowpayments)
- Added HIDDEN_CONFIG_KEYS set to hide keys managed via dedicated UI (splits, logo, favicon)
- Added categoryDescription for each category with descriptive text
- Rewrote admin config section with 2-column grid layout
- Each config field now shows: friendly label from CONFIG_LABELS, description, and proper input type
- Boolean configs: Switch with "Ativado"/"Desativado" labels and emerald/zinc coloring
- Number configs: Input with unit suffix overlay (USDT, %, horas)
- Secret configs: Password input with Lock icon + Eye/EyeOff toggle button
- Select configs: Dropdown select for enum values (affiliate_commission_mode)
- Modified fields get amber ring highlight + "modificado" badge + revert button
- Category icons now use emerald-400 color (matching mining-protocol pattern)
- Category descriptions shown below the title

Stage Summary:
- Admin config UI now matches mining-protocol quality with CONFIG_LABELS pattern
- All config keys have friendly Portuguese labels and descriptions
- 5 field types supported: boolean (Switch), number (with unit), string (Input), secret (password with eye toggle), select (dropdown)
- 2-column grid layout on desktop, single column on mobile
- Visual feedback: amber ring on modified fields, emerald/zinc status labels
- HIDDEN_CONFIG_KEYS hides internal keys from the UI
---
Task ID: 1
Agent: Main Agent
Task: Complete payment methods audit and admin config overhaul

Work Log:
- Analyzed 3 screenshots from mining-protocol admin config panel (Marca do Site, Depósito/Saques, Afiliado/NowPayments)
- Fixed copy-traders API 405 errors by adding PUT (update) and DELETE handlers to route
- Added missing config keys to setup route: withdrawal_interval_hours, usdt_brl_rate, site_logo, site_favicon, nowpayments credentials
- Updated migrate-config route with comprehensive list of missing config keys
- Added 'branding' category to admin config validation schema along with 'secret' type
- Added CONFIG_LABELS entries for: site_logo, site_favicon, usdt_brl_rate, withdrawal_interval_hours
- Added branding category with Image icon and description
- Reorganized admin config section order: branding > general > deposit > withdrawal > trading > affiliate > nowpayments
- Added branding section with logo/favicon preview in admin UI
- Added NowPayments connection test button with test-connection API endpoint
- Added withdrawal method toggles (manual_withdrawal_enabled, nowpayments_withdrawal_enabled) enforcement
- Added withdrawal interval check (configurable minimum hours between withdrawals)
- Ensured affiliate withdrawal API also respects manual_withdrawal_enabled toggle
- Updated site config API with new fields (siteLogo, siteFavicon, usdtBrlRate, maintenanceMode, withdrawalIntervalHours)
- Updated landing config API with branding and exchange rate fields
- Removed site_logo/site_favicon from HIDDEN_CONFIG_KEYS (now visible in branding section)
- Replaced hardcoded "Setup NowPayments" button with generic "Migrar Configs" button
- Pushed commit to GitHub

Stage Summary:
- Copy-traders API: PUT and DELETE now work (was 405 before)
- Admin config now has 7 organized sections matching mining-protocol pattern
- All payment methods have proper enable/disable toggles (deposit: PIX, USDT, Manual, NowPayments; withdrawal: Manual, NowPayments)
- Withdrawal interval feature added (configurable hours between withdrawals)
- Logo/favicon URL fields with preview in branding section
- NowPayments connection test button added
- All changes pushed to GitHub (commit f74e162)
