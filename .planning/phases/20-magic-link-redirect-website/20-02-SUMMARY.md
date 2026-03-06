---
phase: 20-magic-link-redirect-website
plan: 02
subsystem: infra
tags: [expo, deep-links, universal-links, app-links, ios, android, expo-router]

# Dependency graph
requires:
  - phase: 20-magic-link-redirect-website/20-01
    provides: AASA and assetlinks.json files hosted at well-known paths; domain-side of Universal Link / App Link two-sided handshake
provides:
  - expo.ios.bundleIdentifier "com.gatherly.gatherly" declared in app.json
  - expo.ios.associatedDomains ["applinks:YOUR_DOMAIN"] for iOS Universal Links
  - expo.android.package "com.gatherly.gatherly" declared in app.json
  - expo.android.intentFilters with autoVerify: true for Android App Links on /magic-link paths
  - Retained scheme "gatherly" for existing invite deep links
affects: [EAS Build configuration, iOS entitlement generation, Android manifest intent filters, magic-link deep link routing]

# Tech tracking
tech-stack:
  added: []
  patterns: [Expo app.json dual-platform deep link declaration (associatedDomains + intentFilters), YOUR_DOMAIN placeholder convention for environment-specific domain substitution]

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app.json

key-decisions:
  - "bundleIdentifier and android package both set to com.gatherly.gatherly — must match AASA appID and assetlinks package_name from Plan 01"
  - "YOUR_DOMAIN placeholder used in both associatedDomains and intentFilters host — must be replaced with production domain (e.g., gatherly.app) before EAS Build"
  - "scheme: gatherly retained — still required for join-event invite deep links (gatherly:// custom scheme)"
  - "autoVerify: true on intentFilters — required for Android App Links automatic verification without user confirmation dialog"
  - "pathPrefix: /magic-link — scopes App Link interception to magic-link paths only, not all HTTPS URLs on the domain"

patterns-established:
  - "YOUR_DOMAIN placeholder pattern: use literal string YOUR_DOMAIN in app.json for domain values that are environment-specific; replace before EAS Build"

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 20 Plan 02: Universal Links and App Links Config Summary

**iOS Universal Links (associatedDomains) and Android App Links (intentFilters) added to app.json with bundleIdentifier/package "com.gatherly.gatherly", completing the native app side of the two-sided deep link handshake**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-06T07:35:23Z
- **Completed:** 2026-03-06T07:36:31Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `expo.ios.bundleIdentifier: "com.gatherly.gatherly"` and `expo.ios.associatedDomains: ["applinks:YOUR_DOMAIN"]` for iOS Universal Links
- Added `expo.android.package: "com.gatherly.gatherly"` and `expo.android.intentFilters` with `autoVerify: true`, `scheme: "https"`, `pathPrefix: "/magic-link"` for Android App Links
- Retained `"scheme": "gatherly"` for existing invite deep link flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Universal Links and App Links config to app.json** - `484a688` (feat)

**Plan metadata:** see docs commit below

## Files Created/Modified

- `apps/gatherly-mobile/app.json` - Added iOS Universal Links and Android App Links configuration; added bundleIdentifier and android package; retained existing scheme

## Decisions Made

- `YOUR_DOMAIN` placeholder used in both `associatedDomains` and `intentFilters.data.host` — must be replaced with the actual production domain (e.g., `gatherly.app`) before running an EAS Build. No `https://` prefix in these values.
- `bundleIdentifier` and `android.package` both set to `com.gatherly.gatherly` to match the `appID` in the AASA file and `package_name` in assetlinks.json from Plan 01.
- `autoVerify: true` is mandatory for Android App Links; without it, Android shows a disambiguation dialog instead of opening the app directly.
- `pathPrefix: "/magic-link"` scopes interception to magic-link paths only, avoiding broad domain capture.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before running an EAS Build, replace `YOUR_DOMAIN` in `apps/gatherly-mobile/app.json` in two places:
- `expo.ios.associatedDomains`: change `"applinks:YOUR_DOMAIN"` to `"applinks:gatherly.app"` (or your actual domain, no `https://`)
- `expo.android.intentFilters[0].data[0].host`: change `"YOUR_DOMAIN"` to `"gatherly.app"`

This domain must match the domain hosting the AASA and assetlinks.json files from Plan 01.

## Next Phase Readiness

- app.json is ready for EAS Build once `YOUR_DOMAIN` is replaced with the production domain
- iOS: EAS will include the Associated Domains entitlement in the provisioning profile using `bundleIdentifier`
- Android: EAS will include the intent filters in AndroidManifest.xml using the `intentFilters` config
- The two-sided handshake (Plan 01: server files + Plan 02: app declaration) is now complete — magic-link URLs on the declared domain will open the Gatherly app directly

---
*Phase: 20-magic-link-redirect-website*
*Completed: 2026-03-06*
