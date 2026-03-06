---
phase: 20-magic-link-redirect-website
plan: 01
subsystem: infra
tags: [universal-links, app-links, deep-link, aasa, well-known, magic-link, ios, android]

# Dependency graph
requires: []
provides:
  - iOS Universal Links AASA file at apps/gatherly/public/.well-known/apple-app-site-association
  - Android App Links assetlinks.json at apps/gatherly/public/.well-known/assetlinks.json
  - Simplified magic-link.tsx web fallback with no custom scheme redirect
affects:
  - 20-02 (mobile app Universal Links configuration — must reference TEAMID and bundle identifier)
  - hosting/deployment configuration (AASA needs Content-Type: application/json header)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Universal Links pattern: OS intercepts magic link URL and opens app directly; web page is fallback only when app not installed"
    - "Placeholder pattern for AASA: TEAMID and SHA256 fingerprint placeholders documented in README"

key-files:
  created:
    - apps/gatherly/public/.well-known/apple-app-site-association
    - apps/gatherly/public/.well-known/assetlinks.json
    - apps/gatherly/public/.well-known/README.md
  modified:
    - apps/gatherly/src/pages/magic-link.tsx

key-decisions:
  - "TEAMID placeholder in AASA — actual Apple Developer Team ID added before production deploy"
  - "SHA256 fingerprint placeholder in assetlinks.json — obtained from EAS Build credentials after first build"
  - "magic-link.tsx calls loginWithMagicLink(token) directly with no delay — Universal Links make the timeout unnecessary"

patterns-established:
  - "Well-known files in public/: static assets served by Vite at /.well-known/ path"
  - "AASA Content-Type requirement documented in README.md co-located with the file"

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 20 Plan 01: Well-Known Files and Magic Link Simplification Summary

**iOS AASA and Android assetlinks.json hosted in web SPA public directory; magic-link.tsx simplified to direct web auth with no gatherly:// custom scheme or timeout**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T07:36:04Z
- **Completed:** 2026-03-06T07:37:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `apple-app-site-association` for iOS Universal Links with `applinks` config scoped to `/magic-link/*` paths
- Created `assetlinks.json` for Android App Links with `delegate_permission/common.handle_all_urls`
- Added README.md documenting Content-Type header requirement and placeholder replacement instructions
- Removed `gatherly://` custom scheme redirect, 2000ms timeout, useRef guard, and APP_OPEN_TIMEOUT_MS constant from magic-link.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .well-known/ verification files** - `e7f8b3b` (chore)
2. **Task 2: Simplify magic-link.tsx** - `f7f4e6f` (refactor)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `apps/gatherly/public/.well-known/apple-app-site-association` - iOS Universal Links verification; appID is TEAMID.com.gatherly.gatherly (placeholder)
- `apps/gatherly/public/.well-known/assetlinks.json` - Android App Links verification; SHA256 fingerprint is placeholder
- `apps/gatherly/public/.well-known/README.md` - Documents Content-Type requirement, Netlify/Vercel/nginx config, and placeholder replacement steps
- `apps/gatherly/src/pages/magic-link.tsx` - Removed gatherly:// redirect and setTimeout; calls loginWithMagicLink(token) directly on mount

## Decisions Made

- TEAMID placeholder used in AASA — the 10-character Apple Developer Team ID is only available from developer.apple.com and must be substituted before deployment
- SHA256 fingerprint placeholder used in assetlinks.json — fingerprint is obtained from EAS Build credentials after the first production build with the bundle identifier configured
- No delay in magic-link.tsx — with Universal Links, the OS routes to the app before JavaScript runs; if the page loads at all, the app is absent and auth should proceed immediately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before deploying to production, two placeholders must be replaced:

1. **apple-app-site-association:** Replace `TEAMID` with the 10-character Apple Developer Team ID from developer.apple.com → Account → Membership
2. **assetlinks.json:** Replace `PLACEHOLDER:SHA256:FINGERPRINT:FROM:EAS:CREDENTIALS` with the actual SHA256 fingerprint from EAS Build credentials (available after first production Android build)
3. **Hosting platform:** Configure `Content-Type: application/json` for `/.well-known/apple-app-site-association` — see README.md in the `.well-known/` directory for platform-specific instructions

## Next Phase Readiness

- `.well-known/` files are in place and will be served by Vite at the correct paths
- magic-link.tsx is clean — no custom scheme, no timeout
- Plan 02 (mobile app Universal Links configuration) can now configure `associatedDomains` in app.json pointing to the web SPA domain; the AASA file will be present to validate the association
- Blocker: TEAMID and SHA256 fingerprint must be filled in before iOS/Android Universal Links will work in production

---
*Phase: 20-magic-link-redirect-website*
*Completed: 2026-03-06*
