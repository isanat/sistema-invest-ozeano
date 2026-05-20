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
