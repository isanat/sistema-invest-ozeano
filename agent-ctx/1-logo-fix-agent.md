# Task 1 — Logo Fix Agent

## Summary
Fixed the dynamic logo display issue where admin-uploaded logos were never shown because all components hardcoded `/logo.png` instead of reading the `site_logo` SystemConfig value from the API.

## Changes Made

### 1. `/home/z/my-project/src/components/dashboard/dashboard-sidebar.tsx`
- Added `siteLogo` state in `DashboardSidebar` component (parent) with `useEffect` fetch from `/api/site/config`
- Passed `siteLogo` as prop to `SidebarContent` component
- Updated 2 `<img>` tags: desktop sidebar logo + mobile header logo → `src={siteLogo || '/logo.png'}`

### 2. `/home/z/my-project/src/components/landing/landing-page.tsx`
- Added `siteLogo` state in `Navbar` component with `useEffect` fetch
- Updated 1 `<img>` tag: navbar logo → `src={siteLogo || '/logo.png'}`

### 3. `/home/z/my-project/src/components/landing/footer.tsx`
- Added `useState, useEffect` imports and `siteLogo` state with fetch
- Updated 1 `<img>` tag: footer logo → `src={siteLogo || '/logo.png'}`

### 4. `/home/z/my-project/src/app/page.tsx`
- Added `siteLogo: string` to `siteConfig` state type and initial value
- Added `siteLogo: data.siteLogo ?? ''` in existing useEffect
- Updated 3 `<img>` tags: fixed nav, desktop sidebar, mobile sidebar → `src={siteConfig.siteLogo || '/logo.png'}`

## API Response Format
- `/api/site/config` returns `{ success: true, siteLogo: "data:image/png;base64,...", ... }` (flat, via `apiSuccess`)
- When no logo uploaded, `siteLogo` is empty string `""`

## Verification
- Zero hardcoded `/logo.png` src references remain in src/ (grep confirmed)
- ESLint passes (only pre-existing set-env.js warnings)
- Dev server compiles and runs correctly
