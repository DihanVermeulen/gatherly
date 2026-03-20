---
phase: 31
plan: 01
subsystem: auth-onboarding
tags: [auth, onboarding, navigation, mobile, postgresql, expo-router]
requires: [30-01, 30-02]
provides: [onboarding-plumbing, welcome-carousel, auth-type-updates]
affects: [31-02]
tech-stack:
  added: [expo-haptics]
  patterns: [strict-equality-onboarding-guard, patch-object-api, updateUser-helper]
key-files:
  created:
    - apps/api/src/db/migrations/015-phase31-onboarding.sql
    - apps/gatherly-mobile/app/welcome.tsx
    - apps/gatherly-mobile/app/onboarding/profile-setup.tsx
    - apps/gatherly-mobile/app/onboarding/preferences.tsx
  modified:
    - apps/api/src/routes/auth.ts
    - apps/gatherly-mobile/app/api/auth.ts
    - apps/gatherly-mobile/app/api/users.ts
    - apps/gatherly-mobile/app/contexts/AuthContext.tsx
    - apps/gatherly-mobile/app/(tabs)/index.tsx
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/app/(tabs)/profile.tsx
decisions:
  - "welcome screen is first in unauth guard — becomes default landing for unauthenticated users"
  - "onboarding screens registered in auth guard block so they are accessible to logged-in users"
  - "router.replace('...as never') used for onboarding route because Expo Router strict types don't include dynamic nested routes"
  - "user.onboardingComplete === false (strict) prevents false-positive redirect for magic-link participants where field is undefined"
metrics:
  duration: 12m 28s
  completed: 2026-03-20
---

# Phase 31 Plan 01: Onboarding Plumbing Summary

**One-liner:** JWT auth responses include onboardingComplete, DB default fixed to FALSE, mobile types updated, welcome carousel built with 3 slides, and post-auth onboarding redirect guard added.

## What Was Built

All foundational onboarding plumbing across backend and mobile:

1. **DB migration 015** — `onboarding_complete` column default changed to `FALSE` for new user INSERTs. Existing users retain `true` (set by migration 014).

2. **Backend auth responses** — `/register`, `/login`, and `/refresh` (user branch only, not participant branch) now include `onboardingComplete` in the user object. Register hardcodes `false` (new users haven't onboarded). Login and refresh read `onboarding_complete` from the DB and return it.

3. **Mobile User interface** — `onboardingComplete?: boolean` added as optional field. Present for full-account users, absent for magic-link participants.

4. **UserProfile interface** — Extended with `bio`, `interests`, `avatarUrl`, `onboardingComplete` fields matching the Phase 30 backend schema.

5. **usersApi.updateMe** — Refactored from `(name: string)` to `(patch: {...})` accepting partial updates for name, bio, interests, avatarUrl, and onboardingComplete.

6. **AuthContext.updateUser** — New helper that patches the in-memory user object and persists to SecureStore. Exposed via context value.

7. **profile.tsx migration** — `usersApi.updateMe(nameInput.trim())` updated to `usersApi.updateMe({ name: nameInput.trim() })`.

8. **Welcome carousel screen** — 3-slide FlatList with `pagingEnabled`, dot indicators (active dot is 24px wide and teal, inactive 8px grey), illustration area, Get Started button (teal, routes to `/register`), Log In pressable (routes to `/sign-in`).

9. **Navigation guards** — `_layout.tsx` now has `welcome` as first screen in unauth guard (makes it the default for unauthenticated users). Onboarding screens registered in authenticated guard.

10. **Onboarding redirect** — `(tabs)/index.tsx` checks `user.onboardingComplete === false` (strict equality) and redirects to `/onboarding/profile-setup`. Magic-link participants are unaffected because their `User` object has no `onboardingComplete` field (undefined !== false).

## Decisions Made

| Decision | Rationale |
|---|---|
| `=== false` strict check in redirect | Prevents false positives for magic-link participants where `onboardingComplete` is `undefined` |
| Onboarding screens in auth guard | They require a logged-in user; putting them in a separate guard would be redundant |
| `as never` cast for router.replace | Expo Router's generated types don't include nested onboarding routes at TS check time |
| expo-haptics installed now | Plan 02 needs it; installing in Plan 01 avoids blocking Task 2 in Plan 02 |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Plan 02 (onboarding screens UI) can now:
- Use `updateUser({ onboardingComplete: true })` from `useSession()` to mark onboarding complete
- Use `usersApi.updateMe({ name, bio, interests })` for the profile setup form
- Navigate from profile-setup to preferences to main app without touching auth or routing
- expo-haptics is already installed for haptic feedback in onboarding

No blockers.
