---
phase: 12
plan: "01"
name: auth-foundation-login-screen
subsystem: authentication
tags: [expo-secure-store, auth, jwt, axios, react-native, gluestack, login]

dependency-graph:
  requires: [phase-11-navigation-foundation]
  provides:
    - SecureStore-backed AuthContext with silent refresh on mount
    - Login screen matching Register.png design (Welcome Back)
    - Fixed axios interceptor (no more window.location.href)
    - Profile screen Log Out button
  affects:
    - phase-12-02: Register screen builds on AuthContext and _layout.tsx patterns established here

tech-stack:
  added: [expo-secure-store@15.0.8]
  patterns:
    - SecureStore for native token persistence (accessToken + user JSON)
    - signOutCallback pattern — interceptor calls AuthContext's signOut then router.replace
    - 2-arg signIn(accessToken, user) — HttpOnly cookie carries refreshToken
    - Silent refresh on app mount to restore session without showing Login

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/contexts/AuthContext.tsx
    - apps/gatherly-mobile/app/api/client.ts
    - apps/gatherly-mobile/app/api/auth.ts
    - apps/gatherly-mobile/app/sign-in.tsx
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/app/(tabs)/profile.tsx
    - apps/gatherly-mobile/package.json
    - apps/gatherly-mobile/package-lock.json

decisions:
  - choice: "router.push('/register' as never) for untyped route"
    rationale: "register route does not exist until Plan 12-02; cast avoids TS error without disabling check globally"
    alternatives: ["skip link", "add placeholder register.tsx stub"]

metrics:
  duration: "6m"
  completed: "2026-02-23"
---

# Phase 12 Plan 01: Auth Foundation Login Screen Summary

**One-liner:** SecureStore-backed AuthContext with 2-arg signIn, Login screen matching Register.png "Welcome Back" design, fixed axios interceptor using signOutCallback + router.replace, and profile Log Out button.

## What Was Built

### Task 1: expo-secure-store + AuthContext + client.ts fix (commit: 4511b04)

Installed `expo-secure-store@~15.0.8` via npm. Rewrote `AuthContext.tsx` with:
- Full SecureStore-backed session persistence (accessToken + user JSON stored natively)
- 2-argument `signIn(accessToken: string, user: User)` — no refreshToken param (it lives in HttpOnly cookie)
- Silent refresh on mount: calls `authApi.refresh()` (cookie-based), stores result, sets state; on failure clears all keys and shows login
- `finally` block guarantees `setIsLoading(false)` always fires, unblocking splash screen
- Registers `setSignOutCallback(signOut)` so the axios interceptor can call signOut on unrecoverable 401

Fixed `client.ts`:
- Replaced `window.location.href = "/login"` with `if (_signOutCallback) await _signOutCallback(); router.replace('/sign-in')`
- Added `setSignOutCallback` export and `_signOutCallback` module-level variable
- Changed `VITE_API_URL` to `EXPO_PUBLIC_API_URL` (Expo convention)

Updated `auth.ts`: `refresh()` now accepts optional `refreshToken?: string` body param for future use.

### Task 2: Login screen (commit: ee0e1f5)

Replaced stub `sign-in.tsx` with 245-line full implementation matching Register.png "Welcome Back" design:
- Header: back arrow (only if router.canGoBack()) + Gatherly teal circle logo + name
- "Welcome Back" heading (Heading size 2xl) + subtitle text
- Email Address input (outline, rounded-2xl, no icons)
- Password field with Forgot Password? link + eye toggle (Eye/EyeOff from lucide)
- Log In button (teal, full width, shows ButtonSpinner while submitting, disabled during load)
- "OR CONTINUE WITH" divider with Divider components
- Google + Apple outline buttons (UI-only placeholders)
- "Don't have an account? Sign Up" footer — Sign Up navigates to `/register`
- Inline error display from API response; clears on typing
- 2-arg `signIn(response.accessToken, response.user)` call on success

Also added `register` route to unauthenticated `Stack.Protected` guard in `_layout.tsx` (required for Plan 12-02).

### Task 3: Profile Log Out button (commit: cba04bc)

Updated `profile.tsx` with:
- `useSession()` destructures `signOut` and `user`
- Shows user email if available
- Log Out button: `action="negative"`, `variant="outline"`, LogOut icon from lucide, calls `signOut()` on press
- Covers AUTH-04 logout requirement

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| router.push type cast | `"/register" as never` | Route not typed until Plan 12-02 creates the file; cast is minimal and self-documenting |
| pnpm install failure | Used `npm install` directly | pnpm virtual store dir length mismatch; mobile app has its own npm lock file |
| No REFRESH_TOKEN_KEY | HttpOnly cookie only | Backend does not return refreshToken in body; only accessToken+user stored in SecureStore |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm install failed for expo-secure-store**

- **Found during:** Task 1 Step 1
- **Issue:** `ERR_PNPM_VIRTUAL_STORE_DIR_MAX_LENGTH_DIFF` — pnpm virtual store was created with different path length settings; monorepo pnpm workspace config incompatible
- **Fix:** Used `npm install expo-secure-store@~15.0.8 --legacy-peer-deps` directly in the mobile app directory (which already has its own `package-lock.json`)
- **Files modified:** `apps/gatherly-mobile/package.json`, `apps/gatherly-mobile/package-lock.json`
- **Impact:** None — npm installed the package correctly into the mobile app's local `node_modules`

**2. [Rule 1 - Bug] TypeScript error for /register route**

- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `Argument of type '"/register"' is not assignable to parameter of type` — Expo Router generates typed routes, and `register` doesn't exist yet (Plan 12-02)
- **Fix:** Cast to `"/register" as never` — minimal workaround that doesn't disable global type checking
- **Files modified:** `apps/gatherly-mobile/app/sign-in.tsx`

## Verification Results

| Check | Status |
|-------|--------|
| sign-in.tsx >= 80 lines | PASS (245 lines) |
| "Welcome Back" heading present | PASS |
| "Sign Up" link navigates to /register | PASS |
| _layout.tsx has register route | PASS |
| signIn(response.accessToken, response.user) — 2-arg | PASS |
| No window.location in app/ directory | PASS |
| No VITE_API_URL in app/ directory | PASS |
| SecureStore.getItemAsync/setItemAsync/deleteItemAsync in AuthContext | PASS |
| finally block sets isLoading=false | PASS |
| router.replace in client.ts after signOutCallback | PASS |
| setSignOutCallback exported from client.ts | PASS |
| signOut in profile.tsx | PASS |
| Log Out button text in profile.tsx | PASS |
| No TS errors in our app files | PASS |

## Next Phase Readiness

Plan 12-02 (Register screen) can proceed immediately:
- `register` route is already registered in `_layout.tsx` unauthenticated guard
- `AuthContext` is fully implemented with `signIn(accessToken, user)` ready to use
- `authApi.register()` exists in `auth.ts`
- `router.push("/register" as never)` from Login screen already wired up
