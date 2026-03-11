---
phase: 12
plan: "02"
name: register-screen-and-refresh-fallback
subsystem: authentication
status: complete
completed: 2026-02-26
tags: [expo-router, gluestack, auth, register, jwt, refresh]

dependency-graph:
  requires: [12-01]
  provides:
    - Register screen matching Login.png template ("Create your account")
    - Backend /refresh endpoint accepts req.body.refreshToken as fallback
  affects:
    - auth round-trip complete: register → auto-login → session persistence

tech-stack:
  added: []
  patterns:
    - req.body?.refreshToken fallback — mobile session persistence across app restarts
    - authApi.register() → signIn(accessToken, user) — immediate auto-login after registration

key-files:
  created:
    - apps/gatherly-mobile/app/register.tsx
  modified:
    - apps/api/src/routes/auth.ts

decisions:
  - choice: "router.back() for Log In link — navigates back to sign-in.tsx"
    rationale: "Register is pushed onto the stack from sign-in; back() returns there without a new route push"
  - choice: "req.cookies.refreshToken || req.body?.refreshToken for refresh endpoint"
    rationale: "Mobile Expo apps cannot persist HttpOnly cookies across app restarts; body fallback lets mobile send stored refreshToken"

metrics:
  duration: "~2 minutes"
  tasks_completed: 1
---

# Phase 12 Plan 02 Summary: Register Screen + Backend Refresh Fallback

**One-liner:** Register screen (275 lines, matching Login.png "Create your account" template) + one-line backend patch so mobile sessions persist across app restarts.

## What Was Built

**`apps/gatherly-mobile/app/register.tsx`** — Full register screen with:
- Back arrow + "Join Gatherly" header row
- Circular Users icon in teal
- "Create your account" heading + subtitle
- Full Name field (User icon, autoCapitalize="words")
- Email Address field (Mail icon, email keyboard, autoCapitalize="none")
- Password field (Lock icon + Eye/EyeOff toggle)
- Terms of Service / Privacy Policy text (UI only)
- Inline error display (name/email required, password min 8 chars, API errors: 409 conflict, 400 validation)
- Create Account button with ButtonSpinner while submitting, disabled during submit
- Divider + "Already have an account? Log In" footer (router.back())
- On success: `authApi.register()` → `signIn(accessToken, user)` auto-login

**`apps/api/src/routes/auth.ts`** line 166 — refresh endpoint now reads:
```typescript
const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
```

## Commits

| Task | Hash | Files |
|------|------|-------|
| Create register screen + backend refresh body fallback | 647da08 | apps/gatherly-mobile/app/register.tsx, apps/api/src/routes/auth.ts |

## Deviations

None — plan executed exactly as specified.

## Issues

None.
