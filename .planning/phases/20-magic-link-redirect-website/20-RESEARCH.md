# Phase 20: Magic Link Redirect Website - Research

**Researched:** 2026-03-05
**Domain:** Mobile deep linking, web-to-app redirect, iOS Universal Links, Android App Links
**Confidence:** MEDIUM-HIGH

## Summary

This phase improves how magic link emails route users to the correct destination: the mobile app if installed, or the web SPA as fallback. The existing implementation (`apps/gatherly/src/pages/magic-link.tsx`) uses `window.location.href = 'gatherly://...'` with a 2000ms timeout, which is unreliable and creates a broken UX on iOS Safari when the app is not installed.

The production-proven solution is to replace the custom scheme (`gatherly://`) approach with iOS Universal Links and Android App Links. These use HTTPS URLs (the same domain as the web app), meaning the magic link URL itself becomes the universal link. When the app is installed, the OS intercepts the HTTPS navigation and opens the app directly — no JavaScript, no timeout, no error dialogs. When the app is not installed, the browser simply loads the web page normally. This eliminates the need for any JavaScript-based app detection.

The approach is to enhance the existing `apps/gatherly` route (`/magic-link/:token`) rather than build a separate redirect service. The redirect page should remain in the web SPA. The `apps/gatherly` domain just needs to host two verification files (AASA for iOS, assetlinks.json for Android), and `app.json` needs `associatedDomains` and `intentFilters` configured. This requires an Apple Developer account and a rebuild via EAS Build.

**Primary recommendation:** Migrate from `gatherly://` custom scheme to iOS Universal Links + Android App Links using the existing `apps/gatherly` domain. Keep the `/magic-link/:token` route in the SPA. The JS timeout fallback becomes a simple web authentication page — no deep link detection needed.

---

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| iOS Universal Links | iOS 9+ | HTTPS-based deep link into native app | Apple's official standard; no custom scheme error dialogs; automatic web fallback |
| Android App Links | Android 6+ | HTTPS-based deep link into native app | Google's official standard; replaces custom intent schemes |
| `expo.ios.associatedDomains` | Expo SDK 52 | Configures app to handle a domain's Universal Links | Required app-side config for Universal Links |
| `expo.android.intentFilters` | Expo SDK 52 | Configures app to handle a domain's App Links | Required app-side config for Android App Links |
| EAS Build | Current | Builds app with Associated Domains entitlement | Required to register entitlement with Apple automatically |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|---|---|---|---|
| `apple-app-site-association` (AASA) | - | JSON file hosted at `/.well-known/` on web domain | Required for iOS Universal Links verification |
| `assetlinks.json` | - | JSON file hosted at `/.well-known/` on web domain | Required for Android App Links verification |
| `Referrer-Policy: no-referrer` | HTTP header | Prevent token leakage via referrer header | Add to the magic-link page response headers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Universal Links + App Links (recommended) | Custom scheme `gatherly://` + JS timeout | Custom scheme shows iOS Safari error alert when app not installed; timeout is unreliable; bad UX |
| Universal Links + App Links (recommended) | Branch.io / Adjust / AppsFlyer | Third-party SaaS adds dependency, cost, and data sharing; overkill for a small app |
| Universal Links + App Links (recommended) | Firebase Dynamic Links | Firebase Dynamic Links was **shut down August 25, 2025** — cannot use |
| Keep magic-link in `apps/gatherly` SPA | Separate `apps/redirect` micro-app | No benefit — micro-app would need to host same AASA/assetlinks files anyway; adds complexity |

**Installation (no new npm packages needed):**
```bash
# Only config file changes + EAS rebuild required
# The AASA and assetlinks.json are static JSON files, not npm packages
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/gatherly/
├── public/
│   └── .well-known/
│       ├── apple-app-site-association     # iOS Universal Links verification (no .json extension)
│       └── assetlinks.json                # Android App Links verification
└── src/
    └── pages/
        └── magic-link.tsx                 # Enhanced: remove deep link attempt, do web auth only

apps/gatherly-mobile/
└── app.json                               # Add associatedDomains + intentFilters
```

### Pattern 1: Universal Links — How It Works

**What:** The magic link URL (`https://yourapp.com/magic-link/{token}`) IS the Universal Link. No separate redirect step needed.

**When the app IS installed:**
1. User clicks the link in their email client
2. iOS/Android OS intercepts the HTTPS URL (because the AASA/assetlinks.json verified this domain is associated with the app)
3. OS opens the Expo app directly at `app/magic-link/[token].tsx` — the web page never loads
4. No JavaScript, no timeout, no error dialogs

**When the app is NOT installed:**
1. User clicks the link in their email client
2. OS has no app registered for this domain → browser loads normally
3. The `apps/gatherly` SPA renders `/magic-link/:token`
4. Page calls `loginWithMagicLink(token)` directly (the current web redemption flow)
5. No attempt to open a custom scheme — just web auth

**Key insight:** With Universal Links, the web page's job changes entirely. It no longer needs to attempt deep linking. It just needs to be a functional web authentication page as the fallback.

### Pattern 2: AASA File Format

**What:** Static JSON file hosted at `https://yourdomain.com/.well-known/apple-app-site-association`

**Serves from:** `apps/gatherly/public/.well-known/apple-app-site-association` (no `.json` extension)

```json
// Source: https://docs.expo.dev/linking/ios-universal-links/
{
  "applinks": {
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.gatherly",
        "paths": ["/magic-link/*"]
      }
    ]
  }
}
```

Notes:
- `TEAMID` is your 10-character Apple Developer Team ID
- The bundle identifier must match `expo.ios.bundleIdentifier` in app.json
- `paths` uses glob — `*` matches any single path segment but NOT slashes
- `/magic-link/*` correctly matches `/magic-link/{any-token}`
- The file must be served with `Content-Type: application/json`
- The file must be under 128KB uncompressed

### Pattern 3: assetlinks.json File Format

**What:** Static JSON file hosted at `https://yourdomain.com/.well-known/assetlinks.json`

**Serves from:** `apps/gatherly/public/.well-known/assetlinks.json`

```json
// Source: https://expo.dev/blog/universal-and-app-links
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.gatherly",
      "sha256_cert_fingerprints": [
        "YOUR:SHA256:FINGERPRINT:FROM:EAS:CREDENTIALS"
      ]
    }
  }
]
```

Notes:
- SHA256 fingerprint comes from EAS credentials dashboard (`expo.dev`) for development/preview builds
- Production build fingerprint comes from Google Play Console
- `package_name` must match `expo.android.package` in app.json

### Pattern 4: app.json Configuration

```json
// Source: https://docs.expo.dev/linking/ios-universal-links/ + https://docs.expo.dev/linking/android-app-links/
{
  "expo": {
    "scheme": "gatherly",
    "ios": {
      "associatedDomains": ["applinks:yourdomain.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourdomain.com",
              "pathPrefix": "/magic-link"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

Note: Keep `"scheme": "gatherly"` — it may still be used by other flows (e.g., OAuth, invite links). Only magic link emails change to HTTPS URLs.

### Pattern 5: Enhanced Web Fallback Page

After implementing Universal Links, `magic-link.tsx` becomes simpler — it no longer needs to attempt a deep link:

```tsx
// The revised magic-link.tsx logic (web-only fallback)
// Universal Links handle the "app installed" case at the OS level.
// This page only runs when the app is NOT installed.
useEffect(() => {
  if (!token) { navigate("/home"); return; }

  // No deep link attempt needed — Universal Links handle that
  loginWithMagicLink(token)
    .then(() => setPageState("success"))
    .catch((err) => {
      if (err.response?.status === 429) setPageState("rate-limited");
      else setPageState("invalid");
    });
}, [token]);
```

### Pattern 6: Security Headers for Magic Link Page

Add `Referrer-Policy: no-referrer` to prevent token leakage. In React Router 7 / Vite, set this via your web server or `vite.config.ts` server headers for the `/magic-link/*` route.

```http
Referrer-Policy: no-referrer
```

This prevents the token from appearing in the `Referer` header of any requests the page makes.

### Anti-Patterns to Avoid

- **Using `window.location.href = 'gatherly://...'` as the primary flow:** Shows "Safari cannot open the page because the address is invalid" on iOS when the app is not installed. Unreliable across browsers.
- **Building a separate redirect micro-app (`apps/redirect`):** Adds monorepo complexity with zero benefit. The AASA/assetlinks files live on the web domain regardless.
- **Using any third-party deferred deep linking service (Branch, Adjust, etc.):** Firebase Dynamic Links shut down Aug 25, 2025. Others add vendor lock-in and data sharing. Not warranted for this use case.
- **Relying on the 2000ms timeout:** Apple CDN caches the AASA file but timing is unpredictable. Timeout-based detection is inherently broken.
- **JavaScript-based app-open detection (`visibilitychange`, `blur`, `pageshow`):** Unreliable across iOS Safari versions and browsers. Produces inconsistent behavior. Universal Links make this unnecessary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Detecting if native app is installed | Custom JS with `visibilitychange`/`blur`/timeout | iOS Universal Links + Android App Links | OS-level interception is the only reliable method; JS detection fails across browsers and iOS versions |
| Deep link fallback routing | Custom scheme + timeout + JS redirect | Universal Links (HTTPS URL = both the web page AND the deep link) | Universal Links provide automatic fallback to web; no JS required |
| Third-party deferred deep linking | Custom deferred link store | N/A (not needed for this phase) | This phase only needs basic deep link + web fallback, not install-time deferred linking |

**Key insight:** The moment you host the AASA and assetlinks.json files and rebuild the app, the OS handles the routing entirely. The web page becomes a pure fallback — no detection logic needed.

---

## Common Pitfalls

### Pitfall 1: AASA Not Served Correctly

**What goes wrong:** Universal Links silently fall back to browser. No error is shown.
**Why it happens:** The AASA file must be served with `Content-Type: application/json`. If Vite/the web server adds a different content type for extensionless files, Apple's CDN rejects it.
**How to avoid:** Explicitly configure Vite/hosting to serve `/.well-known/apple-app-site-association` with `Content-Type: application/json`. Test with `curl -I https://yourdomain.com/.well-known/apple-app-site-association`.
**Warning signs:** Universal Links work in Apple's validator tool but not on device; iOS falls through to Safari instead of app.

### Pitfall 2: AASA Cached at Install Time

**What goes wrong:** After updating the AASA file, existing app installations don't see the change.
**Why it happens:** iOS downloads the AASA file when the app is installed. It does not refresh the file frequently after that.
**How to avoid:** After any AASA change, uninstall and reinstall the app on test devices. Don't expect existing installs to update automatically.
**Warning signs:** Universal Links work on fresh install but not on existing test devices.

### Pitfall 3: Protocol in `associatedDomains`

**What goes wrong:** Universal Links never work.
**Why it happens:** The domain must be specified WITHOUT the `https://` protocol prefix. E.g., `"applinks:yourdomain.com"` NOT `"applinks:https://yourdomain.com"`.
**How to avoid:** Copy the format from the official Expo docs exactly.

### Pitfall 4: Android SHA256 Fingerprint Mismatch

**What goes wrong:** Android App Links silently fall back to browser.
**Why it happens:** The SHA256 fingerprint in `assetlinks.json` must match the certificate used to sign the APK. Debug builds use a different key than EAS/production builds.
**How to avoid:** Get the fingerprint from the EAS credentials dashboard for each build profile (development, preview, production) and list all relevant fingerprints in the `sha256_cert_fingerprints` array.
**Warning signs:** App Links work for EAS builds but not local debug builds, or vice versa.

### Pitfall 5: `gatherly://` Still Being Triggered

**What goes wrong:** Even after Universal Links setup, some code paths still use the custom scheme, causing iOS Safari error dialogs for non-installed users.
**Why it happens:** The existing `magic-link.tsx` fires `window.location.href = 'gatherly://...'` unconditionally before the timeout.
**How to avoid:** After setting up Universal Links, REMOVE the `window.location.href = 'gatherly://...'` line from `magic-link.tsx` entirely. Universal Links handle the app-open case; the web page is only for the web fallback path.

### Pitfall 6: Wildcard Path Mismatch in AASA

**What goes wrong:** Universal Links only work for some paths, not others.
**Why it happens:** The `*` wildcard in AASA paths does NOT match slashes. `/magic-link/*` correctly matches `/magic-link/abc123` but would not match `/magic-link/abc/123`.
**How to avoid:** Magic link tokens are single path segments — `/magic-link/*` is correct. Verify your token format contains no slashes.

### Pitfall 7: Token Security in URL

**What goes wrong:** Magic link token appears in server access logs, browser history, and referrer headers.
**Why it happens:** Tokens are in the URL path/query string by design, but this creates exposure vectors.
**How to avoid:**
- Tokens are already single-use (invalidated on redemption) — this is the primary mitigation
- Add `Referrer-Policy: no-referrer` response header to the magic-link page
- Use HTTPS everywhere (already required for Universal Links)
- Token in path (not query string) avoids some server log patterns but both are visible in browser history
- 24-hour expiry limits the window of exposure

---

## Code Examples

### AASA File (iOS Universal Links)
```json
// Source: https://docs.expo.dev/linking/ios-universal-links/
// Serve at: apps/gatherly/public/.well-known/apple-app-site-association
// Content-Type: application/json (no file extension)
{
  "applinks": {
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.gatherly",
        "paths": ["/magic-link/*"]
      }
    ]
  }
}
```

### assetlinks.json (Android App Links)
```json
// Source: https://expo.dev/blog/universal-and-app-links
// Serve at: apps/gatherly/public/.well-known/assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.gatherly",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:..."
      ]
    }
  }
]
```

### app.json additions
```json
// Source: https://docs.expo.dev/linking/ios-universal-links/ + https://docs.expo.dev/linking/android-app-links/
{
  "expo": {
    "scheme": "gatherly",
    "ios": {
      "supportsTablet": true,
      "associatedDomains": ["applinks:yourdomain.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourdomain.com",
              "pathPrefix": "/magic-link"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Testing Universal Links (iOS)
```bash
# Source: https://docs.expo.dev/linking/ios-universal-links/
# Validate AASA file is reachable and correctly formatted
curl -I https://yourdomain.com/.well-known/apple-app-site-association

# Test Universal Link on device (opens app if installed)
xcrun simctl openurl booted "https://yourdomain.com/magic-link/test-token"
```

### Testing App Links (Android)
```bash
# Source: https://expo.dev/blog/universal-and-app-links
# Test App Link on device
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://yourdomain.com/magic-link/test-token" \
  com.yourcompany.gatherly

# Verify assetlinks.json
curl https://yourdomain.com/.well-known/assetlinks.json
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `gatherly://` custom scheme + JS timeout | iOS Universal Links + Android App Links | iOS 9+ (2015), now standard by 2025 | No error dialogs; automatic web fallback; reliable OS-level routing |
| Firebase Dynamic Links (deferred deep linking) | **Shut down August 25, 2025** | Deprecated 2023, shutdown Aug 2025 | Cannot use; migrate to Universal Links or Branch/Adjust |
| JS-based app detection (`visibilitychange`, `blur`) | Universal Links (no JS detection needed) | Best practice since iOS 10 | JS detection never worked reliably across browsers |
| Separate redirect service | Same-domain SPA route with AASA hosted files | Established pattern | No separate infrastructure needed |

**Deprecated/outdated:**
- Firebase Dynamic Links: shut down August 25, 2025 — confirmed via official Firebase FAQ
- Custom scheme (`gatherly://`) for email deep links: causes iOS Safari error dialog when app not installed; should remain only as a secondary mechanism for app-to-app links, NOT email links
- 2000ms timeout approach: was always a hack; Universal Links make it obsolete

---

## Open Questions

1. **Domain for hosting AASA files**
   - What we know: The AASA file must be hosted on the same domain that magic link URLs point to. Currently `FRONTEND_URL` env var controls this.
   - What's unclear: What domain is actually deployed for production? Is `apps/gatherly` deployed anywhere? Without a production domain, Universal Links cannot be tested on real devices.
   - Recommendation: If there is no production deployment yet, implement the AASA/assetlinks files now and test using Expo's Universal Link testing tools or a staging domain. The code changes are low-risk even if the domain changes later.

2. **Apple Developer account and bundle identifier**
   - What we know: Universal Links require an Apple Developer account (paid, $99/year) to get a Team ID and register the Associated Domains entitlement. EAS Build registers this automatically during build.
   - What's unclear: Does this project have an active Apple Developer account? Is the app's bundle identifier (`expo.ios.bundleIdentifier`) defined in `app.json`? The current `app.json` does not show a `bundleIdentifier`.
   - Recommendation: Check `app.json` and EAS configuration. If no bundle identifier exists, one must be created and the app registered with Apple before Universal Links can be configured.

3. **Whether to keep `gatherly://` scheme at all**
   - What we know: The scheme is currently `"gatherly"` in `app.json`. Other flows (OAuth, etc.) may use it.
   - What's unclear: Are there other places in the codebase that currently use `gatherly://` deep links besides the magic link page?
   - Recommendation: Keep `"scheme": "gatherly"` in `app.json` to preserve backward compatibility. Only remove the custom-scheme attempt from `magic-link.tsx`.

4. **React Router 7 / Vite serving of `.well-known` files**
   - What we know: Files in `apps/gatherly/public/` are served as static assets. The `.well-known` directory needs to be served by the web server.
   - What's unclear: Does Vite's dev server serve `.well-known/` directories? Does the production hosting (if any) serve them with the correct `Content-Type: application/json`?
   - Recommendation: Test `curl -I http://localhost:3000/.well-known/apple-app-site-association` after adding files. May need to configure Vite's `server.headers` or hosting-level response headers.

---

## Sources

### Primary (HIGH confidence)
- https://docs.expo.dev/linking/ios-universal-links/ — iOS Universal Links setup, AASA format, app.json config, limitations
- https://docs.expo.dev/linking/overview/ — Universal Links vs custom schemes, production recommendations
- https://expo.dev/blog/universal-and-app-links — Full setup guide with EAS Hosting, exact file formats
- https://docs.expo.dev/linking/android-app-links/ — Android App Links setup, assetlinks.json, intentFilters
- https://firebase.google.com/support/dynamic-links-faq — Firebase Dynamic Links shutdown confirmed August 25, 2025

### Secondary (MEDIUM confidence)
- https://byby.dev/ios-deep-linking — iOS custom scheme vs Universal Links comparison; confirmed by Expo official docs
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking — Magic link deep link pattern; confirms Universal Links as recommended approach
- https://gist.github.com/diachedelic/0d60233dab3dcae3215da8a4dfdcd434 — JS-based app detection pattern; documents why it's unreliable across browsers

### Tertiary (LOW confidence)
- WebSearch results on smart banners — Smart App Banners require App Store listing; not applicable for development builds

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official Expo documentation
- Architecture pattern: HIGH — AASA/assetlinks.json format verified from Expo official blog and docs
- Firebase shutdown: HIGH — verified via official Firebase FAQ page
- Pitfalls: MEDIUM — most verified against official docs; some from multiple community sources
- Token security: MEDIUM — verified via MDN referrer-policy documentation

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (90 days — Universal Links API is stable; Expo SDK changes less frequently)
