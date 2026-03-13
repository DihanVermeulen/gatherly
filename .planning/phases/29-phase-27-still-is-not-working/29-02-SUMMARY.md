---
phase: 29-phase-27-still-is-not-working
plan: "02"
subsystem: ui
tags: [react-native, expo-router, gluestack, magic-link, auth, join-flow]

# Dependency graph
requires:
  - phase: 29-phase-27-still-is-not-working
    provides: 29-01 /lookup endpoint + authApi.lookupMagicLink + MagicLinkPreview interface
provides:
  - Full 8-state join flow on magic-link/[token].tsx
  - pendingMagicToken utility for "Join with account" round-trip
  - _layout.tsx consumePendingMagicToken priority redirect after auth
affects:
  - join.tsx (complementary — handles invite codes, magic-link screen handles tokens)
  - event-details.tsx (destination after successful join)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "8-state machine pattern for join flow: loading/preview/name-prompt/joining/success/already-joined/invalid/error"
    - "pendingMagicToken module-level variable: same session-only pattern as pendingInviteCode"
    - "lookup-before-join: /lookup shows preview without side effects, /redeem only called on explicit user action"
    - "auto-join after auth round-trip: useEffect watches session, if preview state and session becomes truthy, calls handleJoin()"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/magic-link/[token].tsx
    - apps/gatherly-mobile/app/utils/pendingInvite.ts
    - apps/gatherly-mobile/app/_layout.tsx

key-decisions:
  - "lookupMagicLink called on mount with retryCount in deps — token doesn't change on retry, retryCount triggers re-fetch"
  - "already-joined check: events.find(e => e.id === String(preview.eventId)) + people.includes(user.name)"
  - "handleJoinWithAccount: setPendingMagicToken then router.push to sign-in (not replace — back gesture works)"
  - "Success auto-dismiss: useEffect watches state === 'success' && eventId, setTimeout 1500ms"
  - "router.push for all event-details navigation (not router.replace) — back navigation preserved"
  - "No refreshEvents() anywhere in magic-link screen — pull-to-refresh is sufficient"

patterns-established:
  - "Magic token priority: _layout.tsx checks consumePendingMagicToken() before consumePendingInviteCode()"

# Metrics
duration: ~15min (across two sessions)
completed: 2026-03-13
---

# Phase 29 Plan 02: Magic-Link Screen Rewrite + pendingMagicToken Utility Summary

**Rewrote magic-link/[token].tsx with full 8-state join flow — event preview shown before any participant record is created. Added pendingMagicToken for the "Join with account" auth round-trip.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-13
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `magic-link/[token].tsx` rewritten with 8-state machine (loading, preview, name-prompt, joining, success, already-joined, invalid, error)
- `/lookup` called on mount via `authApi.lookupMagicLink(token)` — shows event preview (name, organizer, participant count, date) without creating any participant or consuming the token
- Logged-in user: single "Join Event" button → calls `/redeem` → success screen → `event-details` via `router.push`
- Logged-out user: two options — "Join with account" (stores magic token, navigates to sign-in) and "Continue without account" (full-screen name prompt, calls `/redeem` with `participantName`)
- Success screen auto-dismisses after 1.5 seconds with `router.push` (back navigation works)
- `pendingMagicToken` utility added to `pendingInvite.ts` — same module-level pattern as `pendingInviteCode`
- `_layout.tsx` updated to check `consumePendingMagicToken()` first (priority over invite codes) after auth

## Task Commits

1. **Task 1: pendingMagicToken utility + _layout.tsx** - `875982e` (feat)
2. **Task 2: Rewrite magic-link/[token].tsx** - `ebcff95` (feat)

## Files Created/Modified
- `apps/gatherly-mobile/app/magic-link/[token].tsx` — Full rewrite: 8-state machine, /lookup on mount, two-option logged-out flow, name prompt, success auto-dismiss
- `apps/gatherly-mobile/app/utils/pendingInvite.ts` — Added `setPendingMagicToken` + `consumePendingMagicToken` functions
- `apps/gatherly-mobile/app/_layout.tsx` — Updated useEffect to check pending magic token (priority) before pending invite code

## Decisions Made
- `already-joined` check uses `events.find(e => e.id === String(preview.eventId))` — TEvent.id is a string
- Auto-join after auth round-trip: `useEffect([session])` in magic-link screen auto-calls `handleJoin()` when session becomes truthy while in "preview" state
- `handleJoinWithAccount` uses `router.push` (not replace) so back gesture works from sign-in screen
- `retryCount` state variable added — used in lookup effect deps so "Try Again" re-triggers the fetch

## Deviations from Plan
- None — plan executed exactly as written.

## Issues Encountered
- None.

## User Setup Required
- None.

## Next Phase Readiness
- Phase 29 is now fully complete (all 3 plans done)
- Phase 28 (Remove Account Roles) can proceed — `participantId` detection pattern established here
