---
phase: 35-paywall-components
plan: "02"
subsystem: ui
tags: [react-native, expo, paywall, pricing, amber, lucide, expo-web-browser]

requires:
  - phase: 35-01
    provides: UPGRADE_REQUEST_URL constant, expo-web-browser installed, pricing route registered in _layout.tsx

provides:
  - Pricing comparison screen at app/pricing.tsx (Free vs Premium two-card layout)
  - No-price-point demand-capture CTA wired to UPGRADE_REQUEST_URL via Alert + WebBrowser

affects:
  - 36-paywall-wiring (screens that route to /pricing?eventId=X will use this screen)

tech-stack:
  added: []
  patterns:
    - "Pricing screen: SafeAreaView(edges bottom) + AppHeader + ScrollView pattern"
    - "Disabled CTA pattern: disabled={!eventId} with opacity 0.5 inline"
    - "FeatureRow helper component for reusable icon+label rows"
    - "Shared handleUpgradeCta pattern: Alert -> WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL)"

key-files:
  created:
    - apps/gatherly-mobile/app/pricing.tsx
  modified: []

key-decisions:
  - "Free card uses gray (#6b7280) Check icons — visually distinct from Premium amber"
  - "CTA disabled when eventId is empty string (default from useLocalSearchParams)"
  - "FeatureRow extracted as sub-component to keep JSX clean"
  - "handleRequestAccess extracted as module-level function (not inline) for readability"

patterns-established:
  - "Pricing screen amber palette: #fffbeb bg, #f59e0b border, #d97706 button, #92400e title, #b45309 subtitle/pressed"

duration: 1m
completed: 2026-03-28
---

# Phase 35 Plan 02: Pricing Comparison Screen Summary

**Free vs Premium two-card pricing screen with amber CTA that opens external Typeform URL via Alert confirmation — no price points shown**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-28T11:52:38Z
- **Completed:** 2026-03-28T11:53:53Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Free Tier card with 3 feature rows (up to 20 guests, 1 poll, 3 potluck categories) — informational, no CTA
- Premium Tier card with 5 feature rows (unlimited guests/polls/potluck, White Elephant, Gift Exchange) + "Request Access" CTA
- CTA disabled when no eventId, triggers Alert confirmation then opens UPGRADE_REQUEST_URL via expo-web-browser
- No price points ($, /month, /year, billing) anywhere on screen
- AppHeader with "Plans" title and back navigation via router.back()
- 158 lines, TypeScript clean

## Task Commits

1. **Task 1: Build the pricing comparison screen** - `fb401df` (feat)

**Plan metadata:** (included in docs commit below)

## Files Created/Modified

- `apps/gatherly-mobile/app/pricing.tsx` - Pricing comparison screen; default export PricingScreen; reads eventId from search params; Free + Premium cards

## Decisions Made

- Free card Check icons are gray (#6b7280) to visually distinguish them from the amber Premium Check icons — subtle but meaningful hierarchy cue
- `handleRequestAccess` extracted as module-level function rather than inline arrow for readability
- `FeatureRow` component extracted rather than repeating the flex row pattern 8 times
- Disabled CTA uses `disabled={!eventId}` with `opacity: 0.5` inline — same pattern as PaywallBanner

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `components/ui/bottomsheet/index.tsx` and `components/ui/table/index.tsx` are unrelated to this plan and were present before execution (confirmed: no errors in `pricing.tsx`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pricing screen ready to receive `router.push('/pricing?eventId=X')` calls from any screen
- Phase 35 fully complete: PaywallBanner (35-01) + PricingScreen (35-02) + UPGRADE_REQUEST_URL + plansApi + route registration
- Phase 36 (Paywall Wiring) can now wire up participant_cap errors, trial_limit_reached errors, and module-locked screens to route to /pricing

---
*Phase: 35-paywall-components*
*Completed: 2026-03-28*
