---
phase: 20-magic-link-redirect-website
verified: 2026-03-06T07:39:42Z
status: human_needed
score: 9/9 must-haves verified
---
# Phase 20: Magic Link Redirect Website — Verification Report

**Phase Goal:** A hosted redirect page handles magic link email URLs and routes users to the correct destination — mobile app via deep link if installed, or web redemption as fallback.

**Verified:** 2026-03-06T07:39:42Z
**Status:** human_needed

---

## Must-Have Results

All nine code-level must-haves pass automated verification. Three behavioral must-haves require device testing.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AASA file exists with applinks key and /magic-link/* paths | VERIFIED | apple-app-site-association exists, root key is applinks, paths=["/magic-link/*"], appID=TEAMID.com.gatherly.gatherly |
| 2 | assetlinks.json exists with delegate_permission/common.handle_all_urls | VERIFIED | File exists, correct relation, package_name=com.gatherly.gatherly; SHA-256 fingerprint is a placeholder |
| 3 | magic-link.tsx has no gatherly://, setTimeout, useRef, APP_OPEN_TIMEOUT_MS | VERIFIED | grep returns zero matches for all four patterns |
| 4 | magic-link.tsx calls loginWithMagicLink(token) directly in useEffect, no timer | VERIFIED | Line 23: direct call, no setTimeout wrapper; .then/.catch handle state |
| 5 | app.json expo.ios.bundleIdentifier = com.gatherly.gatherly | VERIFIED | Line 18 of app.json |
| 6 | app.json expo.ios.associatedDomains = [applinks:YOUR_DOMAIN] | VERIFIED | Line 19 of app.json; YOUR_DOMAIN is a deploy-time placeholder |
| 7 | app.json expo.android.package = com.gatherly.gatherly | VERIFIED | Line 27 of app.json |
| 8 | app.json expo.android.intentFilters with autoVerify:true and pathPrefix /magic-link | VERIFIED | Lines 28-41 of app.json |
| 9 | scheme gatherly preserved in app.json | VERIFIED | Line 8 of app.json |

**Score:** 9/9 code-level must-haves verified

---

## Artifact Status

| Artifact | Status | Notes |
|----------|--------|-------|
| apps/gatherly/public/.well-known/apple-app-site-association | VERIFIED | Valid JSON, applinks key, /magic-link/* paths, TEAMID placeholder |
| apps/gatherly/public/.well-known/assetlinks.json | VERIFIED | Valid JSON, correct relation and package; SHA-256 fingerprint is PLACEHOLDER — must be replaced with real EAS cert fingerprint before Android App Links function |
| apps/gatherly/src/pages/magic-link.tsx | VERIFIED | 114 lines, four render states, loginWithMagicLink called directly in useEffect with no timer |
| apps/gatherly-mobile/app.json | VERIFIED | scheme, bundleIdentifier, associatedDomains, package, intentFilters all present with correct structure |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| magic-link.tsx useEffect | loginWithMagicLink(token) | Direct call on line 23 | WIRED |
| magic-link.tsx success state | /events/:id | navigate on line 99 | WIRED |
| app.json ios | associated domain | associatedDomains array | WIRED (pending domain substitution) |
| app.json android | intent filter | intentFilters with autoVerify + pathPrefix | WIRED (pending cert fingerprint) |
| apple-app-site-association | /magic-link/* | paths array in details[0] | WIRED |
| assetlinks.json | com.gatherly.gatherly | target.package_name | WIRED (pending cert fingerprint) |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| assetlinks.json | 8 | PLACEHOLDER:SHA256:FINGERPRINT:FROM:EAS:CREDENTIALS | Warning | Android App Links cannot verify the app identity until this is replaced with the real EAS cert fingerprint |
| app.json | 19 | applinks:YOUR_DOMAIN | Warning | iOS Universal Links inactive until real production hostname set |
| app.json | 34 | host: YOUR_DOMAIN | Warning | Android App Links inactive until real production hostname set |
| apple-app-site-association | 5 | TEAMID.com.gatherly.gatherly | Warning | TEAMID placeholder must be replaced with real Apple Team ID before Universal Links activate |

All four are expected deploy-time configuration placeholders, not implementation gaps. The code structure is correct in all cases.

---

## Human Verification Required

These items require a real EAS Build and device testing:

**1. iOS Universal Link — app installed**

Build with `eas build --platform ios`, install on a real iOS 14+ device, tap a magic link from iOS Mail or Safari.

Expected: iOS intercepts the URL via Universal Links and opens the Gatherly app directly. The web fallback page never loads.

Why human: Universal Links only activate when the AASA file is served from a verified HTTPS origin AND a properly signed app with matching Team ID and bundle identifier is installed. Not testable from static files.

Pre-condition: Replace TEAMID in AASA with the real Apple Team ID; replace YOUR_DOMAIN in app.json with the production domain.

---

**2. Android App Link — app installed**

Build with `eas build --platform android`, install the APK on a real Android 6+ device, tap a magic link URL.

Expected: Android intercepts via App Links and opens the Gatherly app directly with no disambiguation dialog.

Why human: Android App Links require the certificate fingerprint in assetlinks.json to match the signing certificate of the installed APK. The current file has a placeholder. Not verifiable from source.

Pre-condition: Replace the PLACEHOLDER fingerprint in assetlinks.json with the real fingerprint from EAS credentials; replace YOUR_DOMAIN with the production domain.

---

**3. Web fallback — app NOT installed**

In a desktop browser or on a device without the app, navigate to https://YOUR_DOMAIN/magic-link/<valid-token>.

Expected: Spinner shows briefly, page transitions to success state with signed-in confirmation and a View My Event button.

Why human: Requires a deployed frontend, running API, and a real unexpired magic link token.

---

## Gaps Summary

No implementation gaps found. All nine code-level must-haves are satisfied.

The phase goal is architecturally complete:
- AASA and assetlinks.json are in place for OS-level deep link routing
- The web fallback page calls loginWithMagicLink directly with no custom scheme or timer logic
- The Expo app config has all required Universal Link and App Link fields with correct structure

Four configuration placeholders (TEAMID, YOUR_DOMAIN x2, SHA-256 fingerprint) are intentional stand-ins for values supplied at deploy time. They are not code defects.

Goal achievement cannot be confirmed until human device testing is completed against a real EAS build with all placeholder values substituted.

---

_Verified: 2026-03-06T07:39:42Z_
_Verifier: Claude (gsd-verifier)_
