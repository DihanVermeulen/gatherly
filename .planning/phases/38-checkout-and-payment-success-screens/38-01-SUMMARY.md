---
phase: 38-checkout-and-payment-success-screens
plan: 01
subsystem: payments
tags: [expo-router, react-native, checkout, card-form, paywall, upgrade]

# Dependency graph
requires:
  - phase: 37-paywall-polish
    provides: PaywallModal and Pricing screen with amber upgrade CTAs
  - phase: 35-paywall-components
    provides: PaywallModal component, PaywallBanner component
  - phase: 34-infrastructure
    provides: plan_tier, PATCH /api/events/:id/upgrade route
provides:
  - Checkout screen (app/checkout.tsx) with order summary, express pay stubs, and 4-field card form
  - upgradeEvent API method on eventsApi
  - PREMIUM_PRICE_DISPLAY constant ($49.00)
  - checkout and payment-success screens registered in app layout
  - PaywallModal Upgrade CTA navigates to /checkout?eventId
  - Pricing screen Upgrade CTA navigates to /checkout?eventId
affects:
  - payment-success screen (38-02 or later)
  - any future real payment integration (replace mock upgradeEvent call)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Checkout mock pattern: any non-empty card fields trigger upgradeEvent, then router.replace to payment-success with synthetic txId and last4"
    - "Express pay stub pattern: Alert.alert('Coming Soon') on Apple Pay / Google Pay buttons"
    - "router.replace (not push) after payment — prevents back-navigation to checkout"

key-files:
  created:
    - apps/gatherly-mobile/app/checkout.tsx
    - apps/gatherly-mobile/.planning/phases/38-checkout-and-payment-success-screens/38-01-SUMMARY.md
  modified:
    - apps/gatherly-mobile/constants/upgrades.ts
    - apps/gatherly-mobile/app/api/events.ts
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/components/PaywallModal.tsx
    - apps/gatherly-mobile/app/pricing.tsx

key-decisions:
  - "Checkout navigation uses router.replace (not push) so user cannot go back to checkout after payment"
  - "PaywallModal help link ('Need help choosing?') retains WebBrowser.openBrowserAsync — only the Upgrade CTA routes to checkout"
  - "Express pay buttons (Apple Pay, Google Pay) are decorative stubs — show 'Coming Soon' alert"
  - "Card form uses plain React Native TextInput (not GlueStack Input) per plan specification"
  - "PREMIUM_PRICE_DISPLAY exported as $49.00 — single source of truth for price shown in checkout"

patterns-established:
  - "Checkout flow: PaywallModal/Pricing -> /checkout?eventId -> upgradeEvent -> /payment-success?eventId&last4&txId"
  - "CardInput reusable component: label + TextInput + optional right icon, all inline styles"

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 38 Plan 01: Checkout and Payment Success Screens Summary

**In-app card payment form (Checkout screen) with order summary, express pay stubs, 4-field card form, and full navigation wiring from PaywallModal/Pricing to checkout to payment-success**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-07T14:09:48Z
- **Completed:** 2026-04-07T14:12:12Z
- **Tasks:** 2
- **Files modified:** 5 (plus 1 created)

## Accomplishments

- Created `app/checkout.tsx` (433 lines) matching Checkout.png template: order summary with event name + price, Apple/Google Pay stubs, OR PAY WITH CARD divider, 4-field card form, secure badge, Pay button with disabled/loading states
- Wired all upgrade CTAs: PaywallModal Upgrade button and Pricing screen Upgrade button both navigate to `/checkout?eventId=X` via router.push
- Added `upgradeEvent` method to `eventsApi` and `PREMIUM_PRICE_DISPLAY` constant; registered checkout/payment-success screens in _layout.tsx auth guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Add infrastructure — API method, constant, layout registration** - `745f350` (feat)
2. **Task 2: Create Checkout screen and wire upgrade CTAs** - `b74b608` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/gatherly-mobile/app/checkout.tsx` - Full checkout screen with card form, order summary, express pay, submit logic
- `apps/gatherly-mobile/constants/upgrades.ts` - Added PREMIUM_PRICE_DISPLAY = "$49.00"
- `apps/gatherly-mobile/app/api/events.ts` - Added upgradeEvent(id) PATCH method
- `apps/gatherly-mobile/app/_layout.tsx` - Registered checkout and payment-success screens in auth guard
- `apps/gatherly-mobile/components/PaywallModal.tsx` - Upgrade CTA now navigates to /checkout; help link retains WebBrowser
- `apps/gatherly-mobile/app/pricing.tsx` - Upgrade CTA now navigates to /checkout; removed unused Alert import

## Decisions Made

- `router.replace` (not `push`) used after payment so user cannot back-navigate to checkout
- PaywallModal "Need help choosing?" link retains `WebBrowser.openBrowserAsync` — only the Upgrade CTA routes to checkout
- Express pay buttons (Apple Pay, Google Pay) show "Coming Soon" alert — decorative for now
- Card form uses plain React Native `TextInput` (not GlueStack Input) per plan specification
- `PREMIUM_PRICE_DISPLAY` = "$49.00" is the single source of truth for price display in checkout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Checkout screen complete and navigation wired; ready for payment-success screen (38-02)
- The `upgradeEvent` PATCH call will fail until backend implements `/api/events/:id/upgrade` — the mock flow still navigates to payment-success via the catch-then-navigate path if backend is absent (note: current code does NOT do this — it shows Alert on error; backend must be implemented for full flow)

---
*Phase: 38-checkout-and-payment-success-screens*
*Completed: 2026-04-07*
