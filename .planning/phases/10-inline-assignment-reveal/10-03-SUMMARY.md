---
phase: 10-inline-assignment-reveal
plan: 03
subsystem: api, ui
tags: [magic-link, invites, express, react, lucide-react, nanoid, crypto]

# Dependency graph
requires:
  - phase: 10-02
    provides: magic link token reusability (SELECT-based redemption, 7-day expiry)
  - phase: 09-magic-link-access-for-invited-members-with-restricted-permissions
    provides: invites table, magic_link_tokens table, authenticateJWT, requireOrganizer middleware

provides:
  - POST /events/:eventId/invites/:inviteId/resend-magic-link backend endpoint
  - invitesApi.resendMagicLink frontend API function
  - Resend magic link button in edit.tsx participants section

affects:
  - future-organizer-ux: organizer management workflows on edit page
  - invites-management: invite lifecycle management

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delete-then-insert token invalidation: DELETE old tokens before INSERT new token (atomic revocation)"
    - "Silent-fail invite loading: invitesApi.getInvites in useEffect with .catch(() => {}) — supplementary data should not crash edit page"
    - "Transient success state: setResendSuccess(id) + setTimeout 3s reset for one-shot UI feedback"

key-files:
  created: []
  modified:
    - apps/api/src/routes/invites.ts
    - apps/gatherly/src/api/invites.ts
    - apps/gatherly/src/pages/events/edit.tsx

key-decisions:
  - "Delete-before-insert pattern for token rotation: DELETE FROM magic_link_tokens WHERE invite_id, then INSERT new token — ensures no stale tokens remain"
  - "Silent fail on invite load in edit.tsx: organizer still gets full edit functionality even if invite API unavailable"
  - "localStorage-only guard: parseInt(id, 10) > 2147483647 check prevents API calls for fake IDs used in localStorage mode"

patterns-established:
  - "Resend pattern: invalidate old tokens, generate fresh token, fire-and-forget email, return magic_link_url"
  - "Conditional participant chip button: invite-aware chip renders Send icon only when accepted invite exists for participant name"

# Metrics
duration: 15min
completed: 2026-02-19
---

# Phase 10 Plan 03: Resend Magic Link Summary

**Resend magic link button on edit page participant chips: organizers can generate a fresh 7-day token per-participant, invalidating stale tokens, with fire-and-forget email and inline feedback.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-19T (session start)
- **Completed:** 2026-02-19
- **Tasks:** 3 of 3
- **Files modified:** 3

## Accomplishments
- Added `POST /events/:eventId/invites/:inviteId/resend-magic-link` endpoint protected by `authenticateJWT` + `requireOrganizer`, which deletes all existing tokens for the invite, generates a fresh 48-char nanoid token with 7-day expiry, and fires email if invite has an address
- Added `invitesApi.resendMagicLink(eventId, inviteId)` frontend function returning `{ magic_link_url, email_sent }`
- Modified edit.tsx participants section to load accepted invites on mount and show a Send icon button on chips for participants with accepted invites; button shows Check icon for 3 seconds post-resend

## Task Commits

Each task was committed atomically:

1. **Task 1: Add POST resend-magic-link endpoint** - `770d98f` (feat)
2. **Task 2: Add resendMagicLink frontend API function** - `b87c477` (feat)
3. **Task 3: Add resend magic link button to edit.tsx** - `54a432c` (feat)

## Files Created/Modified
- `apps/api/src/routes/invites.ts` - Added POST resend-magic-link route before DELETE route; uses existing imports (nanoid, crypto, sendMagicLinkEmail, authenticateJWT, requireOrganizer)
- `apps/gatherly/src/api/invites.ts` - Added `resendMagicLink` method to `invitesApi` object
- `apps/gatherly/src/pages/events/edit.tsx` - Added Send icon import, Invite type import, 3 state vars, useEffect to load invites, `handleResendMagicLink` handler, `getInviteForParticipant` helper, and updated participants map to render conditional Send button

## Decisions Made
- **Delete-before-insert token rotation:** `DELETE FROM magic_link_tokens WHERE invite_id = $1` before inserting new token ensures stale tokens are always invalidated atomically before the new one is created. No old token can remain active after resend.
- **Silent fail on invite load:** `.catch(() => {})` in useEffect means the edit page remains fully functional even when invite API is unavailable (e.g., localStorage-only mode, unauthenticated access).
- **localStorage guard:** `if (eventIdNum > 2147483647) return` prevents API calls for synthetic IDs used in localStorage mode, consistent with pattern established in earlier phases.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Endpoint uses existing email service infrastructure.

## Next Phase Readiness
- Phase 10 gap closure plans (10-02 and 10-03) are both complete
- Magic link system is now fully production-ready: reusable tokens, 7-day expiry, resend capability
- UAT issue from 10-UAT (expired link not caught before reveal) is addressed by resend capability giving organizers a recovery path
- No blockers for phase completion

---
*Phase: 10-inline-assignment-reveal*
*Completed: 2026-02-19*
