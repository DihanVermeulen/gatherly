---
phase: 27-smart-invite-join-account-linking
plan: "03"
subsystem: auth
tags: [magic-link, jwt, express, postgres, invite, participant]

requires:
  - phase: 27-smart-invite-join-account-linking
    provides: /redeem endpoint with user-scoped JWT on email match and dual-shape mobile handler

provides:
  - /redeem accepts optional participantName in body; used verbatim when creating participant on first use
  - /redeem accepts optional email in body as fallback when invite_email IS NULL (QR/link invites)
  - User-scoped JWT issued when effectiveEmail matches a registered user, even for QR/link invites

affects:
  - 27-04-smart-invite-join-account-linking
  - any future mobile screen that calls /redeem with name-prompt or account-detection flow

tech-stack:
  added: []
  patterns:
    - "effectiveEmail pattern: prefer stored invite_email, fall back to client-supplied email for QR/link invites"
    - "resolvedName pattern: prefer clientParticipantName, fall back to email prefix, fall back to 'Participant'"

key-files:
  created: []
  modified:
    - apps/api/src/routes/magicLink.ts

key-decisions:
  - "resolvedName prefers client-supplied participantName over email-prefix derivation — enables explicit name prompt on mobile"
  - "effectiveEmail falls back to clientEmail only when invite_email IS NULL — stored email always takes precedence for security"

patterns-established:
  - "effectiveEmail pattern: (invite.invite_email?.trim().length > 0) ? invite.invite_email : (clientEmail?.trim().length > 0 ? clientEmail.trim() : null)"
  - "resolvedName pattern: clientParticipantName?.trim() first, then email-prefix, then 'Participant'"

duration: ~3min
completed: "2026-03-13"
---

# Phase 27 Plan 03: /redeem participantName + QR-invite email fallback Summary

**`/redeem` now accepts `participantName` (verbatim participant creation) and `email` (effectiveEmail fallback for QR/link invites with NULL invite_email), enabling user-scoped JWT for non-email invites**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-13T07:52:20Z
- **Completed:** 2026-03-13T07:53:12Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `/redeem` destructures `participantName` and `email` from request body alongside `token`
- First-time-use branch uses `resolvedName` (client-supplied name > email prefix > "Participant") in participant INSERT
- User-lookup branch computes `effectiveEmail` — stored invite email takes priority; falls back to client-supplied email when invite has no stored email
- TypeScript compiles cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Accept participantName from client in /redeem** - `05cb0fd` (fix)
2. **Task 2: Accept client email as fallback for NULL invite_email in user-lookup** - `994afb1` (fix)

## Files Created/Modified

- `apps/api/src/routes/magicLink.ts` - Updated `/redeem` handler: destructures `clientParticipantName` + `clientEmail`, resolves participant name via `resolvedName`, computes `effectiveEmail` for user-lookup guard

## Decisions Made

- `effectiveEmail` falls back to `clientEmail` only when `invite.invite_email` is null or empty — stored email always takes precedence. This preserves the security property that a QR invite user cannot impersonate a different email-invite user.
- `resolvedName` prefers the client's explicit name input over the legacy email-prefix derivation, enabling the mobile name-prompt UX planned in 27-04.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend prerequisites for Plan 27-04 (mobile name-prompt and account-detection flows) are complete
- `/redeem` now accepts `{ token, participantName?, email? }` — mobile client in 27-04 can send these fields
- No database migration needed; changes are purely in route logic

---
*Phase: 27-smart-invite-join-account-linking*
*Completed: 2026-03-13*
