---
phase: 27-smart-invite-join-account-linking
plan: "04"
subsystem: auth
tags: [expo-router, magic-link, react-native, jwt, gluestack-ui]

requires:
  - phase: 27-03
    provides: "/redeem now accepts participantName + effectiveEmail fallback; participant-scoped vs user-scoped response shapes"

provides:
  - "Name-prompt UI shown before sign-in completes when redemption returns participant-scoped JWT"
  - "Participant name entered by user sent to /redeem as participantName and stored in DB"
  - "Authenticated user email forwarded to /redeem enabling user-scoped JWT for QR/link invites"
  - "refreshEvents() called after signIn() so joined event appears in events list immediately"
  - "router.push() replaces router.replace() enabling back navigation from event-details"
  - "gestureEnabled: false removed restoring iOS swipe-back gesture"

affects: [phase-28, join-flow, event-details]

tech-stack:
  added: []
  patterns:
    - "name-prompt state machine: loading -> name-prompt -> success (participant-scoped path)"
    - "pendingToken pattern: store token during name-prompt, re-call redeemMagicLink on submit"
    - "storedParticipantName rename: avoids param/destructure clash in redeemMagicLink"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/magic-link/[token].tsx
    - apps/gatherly-mobile/app/api/auth.ts

key-decisions:
  - "pendingToken pattern: re-call /redeem with participantName rather than caching the partial response — ensures DB gets the user-supplied name"
  - "storedParticipantName: destructured userData.participantName renamed to avoid shadowing the optional function param"
  - "router.push not replace: event-details pushed so back arrow/swipe returns to magic-link screen (or its caller)"

patterns-established:
  - "name-prompt before signIn: collect missing data mid-flow, re-call API with enriched payload"

duration: 8min
completed: 2026-03-13
---

# Phase 27 Plan 04: Magic Link Name Prompt and Navigation Fix Summary

**Name-prompt state added to magic-link screen so participant-scoped redemptions collect the user's name before sign-in; authenticated user email forwarded for account detection; router.push and refreshEvents close remaining UAT gaps**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-13T07:55:43Z
- **Completed:** 2026-03-13T08:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Participant-scoped magic-link redemption now shows a "What's your name?" prompt before completing sign-in — the entered name is sent to `/redeem` as `participantName` and stored in the database
- Authenticated user's email passed as optional second argument to `redeemMagicLink` so QR/link invites trigger the user-scoped JWT path when the email matches an existing account
- `refreshEvents()` called after `signIn()` so the newly joined event appears in the events list without requiring a manual refresh
- `router.push()` replaces `router.replace()` and `gestureEnabled: false` is removed so users can navigate back from event-details

## Task Commits

1. **Task 1: Pass authenticated user email and participantName to redeemMagicLink** - `14c889e` (fix)
2. **Task 2: Add name-prompt state, fix navigation, and call refreshEvents after sign-in** - `9f05c50` (fix)

## Files Created/Modified

- `apps/gatherly-mobile/app/api/auth.ts` - Updated `redeemMagicLink` to accept optional `email` (second param) and `participantName` (third param); POST body conditionally spreads them; destructured `participantName` from userData renamed `storedParticipantName` to avoid identifier clash
- `apps/gatherly-mobile/app/magic-link/[token].tsx` - Added `name-prompt` state; `pendingToken`/`participantName`/`isSubmittingName` state vars; `useEvents` import for `refreshEvents`; `user` added to `useSession` destructure; initial effect passes `user?.email` and branches on user-scoped vs participant-scoped; `handleNameSubmit` re-calls `/redeem` with participantName; navigation uses `router.push`; `gestureEnabled: false` removed

## Decisions Made

- **pendingToken pattern:** Re-calls `/redeem` with the user-supplied name rather than holding the partial response — ensures the DB record receives the correct name and the final JWT reflects it
- **storedParticipantName rename:** Necessary to avoid TypeScript duplicate identifier error when the outer function param is also named `participantName`
- **router.push not replace:** Keeps the magic-link screen on the navigation stack so swipe-back and the back arrow both work after landing on event-details

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed destructured `participantName` to `storedParticipantName` in auth.ts**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** Function parameter `participantName` clashed with the destructured variable from `userData` causing TS2300 duplicate identifier errors; also `name: participantName` produced TS2322 because the param is `string | undefined`
- **Fix:** Renamed destructured variable to `storedParticipantName`; `name` field uses `participantName ?? storedParticipantName` so user-supplied name takes precedence when provided
- **Files modified:** `apps/gatherly-mobile/app/api/auth.ts`
- **Verification:** `npx tsc --noEmit` produces no errors in auth.ts or [token].tsx
- **Committed in:** `9f05c50` (Task 2 commit, both files re-staged together)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was essential for TypeScript compilation. No scope creep.

## Issues Encountered

TypeScript duplicate identifier error emerged because the new `participantName` function param shadowed the inner destructure of the same field from `userData`. Resolved by renaming the inner binding to `storedParticipantName` and using nullish coalescing so user-supplied name takes precedence.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three Phase 27 UAT gaps closed: wrong participant name (Gap 2), no back navigation (Gap 3), and account not detected for QR invites (Gap 1)
- Phase 28 (Remove Account Roles) can proceed — no role-based logic in new code
- No blockers

---
*Phase: 27-smart-invite-join-account-linking*
*Completed: 2026-03-13*
