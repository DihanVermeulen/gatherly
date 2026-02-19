---
phase: 10-inline-assignment-reveal
plan: 02
subsystem: api
tags: [magic-link, jwt, express, token-expiry, postgres]

# Dependency graph
requires:
  - phase: 09-magic-link-access-for-invited-members-with-restricted-permissions
    provides: magic_link_tokens table, magic link redemption endpoint, invite system
provides:
  - Reusable magic link tokens (SELECT instead of DELETE on redemption)
  - 7-day token expiry on all magic link creation paths
affects:
  - 10-03 (resend magic link — builds on reusable token pattern)
  - any future phase dealing with participant authentication or magic link flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-destructive token lookup: SELECT instead of DELETE + RETURNING for reusable tokens"
    - "7-day magic link window: consistent expiry across all token creation paths"

key-files:
  created: []
  modified:
    - apps/api/src/routes/magicLink.ts
    - apps/api/src/routes/invites.ts

key-decisions:
  - "SELECT instead of DELETE for magic link redemption — tokens persist so participants can re-click the same link within 7 days"
  - "7-day expiry on all token creation paths — consistent with refresh token window, aligns with user mental model"

patterns-established:
  - "Reusable magic link pattern: token lookup does not consume the token; expiry is the only invalidation mechanism"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 10 Plan 02: Magic Link Reusability Fix Summary

**Non-destructive magic link redemption via SELECT instead of DELETE, with 7-day token expiry replacing 24-hour single-use tokens**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced `DELETE FROM magic_link_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING invite_id` with `SELECT invite_id FROM magic_link_tokens WHERE token_hash = $1 AND expires_at > NOW()` — token now persists in DB after first redemption
- Updated both magic link token creation paths in `invites.ts` from 24-hour to 7-day expiry: `POST /events/:eventId/invites` (line 85) and `POST /invites/:code/accept` (line 306)
- Updated JSDoc in `magicLink.ts` to accurately document the reusable, non-destructive redemption behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Change magic link redemption from single-use DELETE to reusable SELECT** - `18aa757` (fix)
2. **Task 2: Extend magic link token expiry from 24 hours to 7 days** - `b7472d3` (fix)

**Plan metadata:** `(see docs commit below)` (docs: complete plan)

## Files Created/Modified

- `apps/api/src/routes/magicLink.ts` - Changed token consumption from DELETE+RETURNING to SELECT; updated JSDoc to reflect reusable behavior and 7-day window
- `apps/api/src/routes/invites.ts` - Changed both `tokenExpiresAt` calculations from `24 * 60 * 60 * 1000` to `7 * 24 * 60 * 60 * 1000` with `// 7 days` comment

## Decisions Made

- **SELECT instead of DELETE** - UAT found that participants expect to re-click the same emailed magic link multiple times (e.g., if they close the tab). DELETE-on-first-use violated that expectation and left them with a dead link on the second visit.
- **7-day expiry matches refresh token window** - Consistent with the JWT refresh token duration; participants have one week to onboard before needing a new link. The 24-hour window was too short for real-world email workflows.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 complete; magic links are now reusable within their 7-day window
- Plan 03 (resend magic link) can proceed — the resend endpoint will DELETE old tokens + INSERT fresh ones, which is the correct invalidation mechanism now that tokens are otherwise persistent
- TypeScript compiles cleanly across the API app

---
*Phase: 10-inline-assignment-reveal*
*Completed: 2026-02-19*
