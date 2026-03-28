---
phase: 36-paywall-wiring
plan: 01
subsystem: ui
tags: [react-native, expo, gluestack, paywall, modules, premium]

# Dependency graph
requires:
  - phase: 35-paywall-components
    provides: PaywallBanner component, PaywallFeature type, UPGRADE_REQUEST_URL constant
provides:
  - PaywallModal full-screen modal wrapping PaywallBanner
  - Module Config rewired with lock treatment and PaywallModal instead of bespoke upgrade modal
  - Event Details hides premium modules entirely on free-tier events
  - PaywallBanner CTA is now a direct WebBrowser.openBrowserAsync call (no Alert.alert confirmation)
affects: [37-paywall-wiring-remaining, future-premium-feature-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PaywallModal pattern: reusable full-screen GlueStack Modal wrapping PaywallBanner for consistent upgrade UX across all screens"
    - "paywallFeature state pattern: useState<PaywallFeature | null>(null) — modal open when non-null, closed when null"
    - "Lock treatment: isLocked && !comingSoon -> hide Switch, show Lock icon, wrap card in Pressable to open PaywallModal"
    - "Free event premium hiding: PREMIUM_MODULE_TYPES Set + isFree flag -> filter MODULE_CATALOG before rendering"

key-files:
  created:
    - apps/gatherly-mobile/components/PaywallModal.tsx
  modified:
    - apps/gatherly-mobile/components/PaywallBanner.tsx
    - apps/gatherly-mobile/app/modules-config.tsx
    - apps/gatherly-mobile/app/event-details.tsx

key-decisions:
  - "PaywallModal uses size='full' + ModalContent style flex:1 for true full-height coverage"
  - "Locked module cards use Pressable wrapper around the card row to open paywall — not a disabled switch"
  - "Coming-soon modules show empty spacer (width:16) instead of toggle to maintain layout alignment"
  - "event-details.tsx isFree + PREMIUM_MODULE_TYPES defined inside the component after event is found (not top-level constant) to avoid stale closure issues"

patterns-established:
  - "PaywallModal: import PaywallModal + PaywallFeature; add paywallFeature state; render <PaywallModal isOpen={paywallFeature !== null} onClose={() => setPaywallFeature(null)} feature={paywallFeature!} ... />"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 36 Plan 01: Paywall Wiring (Module Config + Event Details) Summary

**PaywallModal component created, Module Config lock treatment wired, Event Details hides premium modules on free events, PaywallBanner Alert.alert confirmation removed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T15:20:20Z
- **Completed:** 2026-03-28T15:22:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created PaywallModal — reusable full-screen GlueStack Modal centred around PaywallBanner with X close button
- Removed Alert.alert confirmation from PaywallBanner CTA; now opens WebBrowser directly
- Module Config: replaced bespoke upgrade modal with PaywallModal; locked modules show lock icon instead of toggle and are tappable to open paywall; coming-soon modules show badge with no toggle
- Event Details: premium module types (polls, rsvp, potluck, white_elephant, photo_gallery, expense_splitter) are hidden entirely on free-tier events

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PaywallModal + fix PaywallBanner CTA** - `6ed6667` (feat)
2. **Task 2: Wire Module Config + Event Details** - `5d7c4a0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/gatherly-mobile/components/PaywallModal.tsx` - New full-screen modal wrapping PaywallBanner with close button
- `apps/gatherly-mobile/components/PaywallBanner.tsx` - Removed Alert.alert; CTA calls WebBrowser.openBrowserAsync directly
- `apps/gatherly-mobile/app/modules-config.tsx` - Replaced showUpgradeModal with paywallFeature state + PaywallModal; lock treatment for premium modules
- `apps/gatherly-mobile/app/event-details.tsx` - Added PREMIUM_MODULE_TYPES set + isFree flag; premium modules filtered out on free events

## Decisions Made
- PaywallModal close button positioned at top:48 (below safe area) rather than top:16 to avoid safe-area overlap on iOS devices
- isFree and PREMIUM_MODULE_TYPES placed inside EventDetailsScreen component (after event is found) rather than as module-level constants — keeps them co-located with usage and avoids any confusion about scope
- handleToggle in modules-config now accepts the full ModuleDef (not just type+isPremium) — cleaner access to mod.label for paywall feature name without extra lookup

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PaywallModal is ready for reuse in other screens (Potluck, Polls, Edit Event)
- Plan 36-02 can now wire PaywallBanner into remaining screens that gate premium features

---
*Phase: 36-paywall-wiring*
*Completed: 2026-03-28*
