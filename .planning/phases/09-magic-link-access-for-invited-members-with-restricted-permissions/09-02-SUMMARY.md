---
phase: 09-magic-link-access
plan: 02
subsystem: auth
tags: [magic-link, nodemailer, email, jwt, token-redemption, express, rate-limiting]

# Dependency graph
requires:
  - phase: 09-01
    provides: magic_link_tokens table schema, generateParticipantTokens() in tokenService

provides:
  - sendMagicLinkEmail function via nodemailer (fire-and-dont-block pattern)
  - POST /api/auth/magic-link/redeem - atomic single-use token redemption returning participant JWT
  - Invite creation now generates magic link token (SHA-256 hash stored) and emails participant
  - magic_link_url included in POST /events/:eventId/invites response

affects:
  - 09-03 (frontend magic-link page that calls /redeem)
  - future invite management UI (magic_link_url now available)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-dont-block email sending (not awaited, errors logged but not thrown)
    - Atomic token consumption via DELETE + RETURNING (ensures single-use at DB level)
    - POST-only redemption mitigates email pre-fetch bot token consumption
    - SHA-256 hash for magic tokens (raw token never stored in DB)
    - Participant provisioning on first magic link use (email prefix as name)

key-files:
  created:
    - apps/api/src/services/emailService.ts
    - apps/api/src/routes/magicLink.ts
  modified:
    - apps/api/src/routes/invites.ts
    - apps/api/src/server.ts

key-decisions:
  - "Fire-and-dont-block email sending - email failure cannot block invite creation"
  - "48-char nanoid for magic tokens - longer than invite codes for extra entropy"
  - "Email prefix (before @) as participant name on first-time magic link use"
  - "Returning participant (accepted invite) reuses existing participant_id"

patterns-established:
  - "Magic link redemption: atomic DELETE + RETURNING for single-use guarantee"
  - "Participant JWT includes participantId + eventId claims for route-level permission checks"
  - "Rate limiting on redemption endpoint: 10 requests per 15 minutes per IP"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 9 Plan 02: Magic Link Email Sending and Token Redemption Summary

**nodemailer-based magic link emails with single-use atomic token redemption returning participant-scoped JWT via POST /api/auth/magic-link/redeem**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T07:18:22Z
- **Completed:** 2026-02-15T07:20:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created email service using nodemailer with configurable SMTP (defaults to MailHog/Mailpit on localhost:1025)
- Built POST /api/auth/magic-link/redeem endpoint with atomic single-use token consumption (DELETE + RETURNING)
- Wired magic link token generation into invite creation flow (48-char nanoid token, SHA-256 hash stored)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create email service and magic link redemption route** - `14cff1a` (feat)
2. **Task 2: Wire magic link generation into invite creation** - `98ca4b4` (feat)

**Plan metadata:** (coming after summary commit)

## Files Created/Modified
- `apps/api/src/services/emailService.ts` - sendMagicLinkEmail via nodemailer, fire-and-dont-block
- `apps/api/src/routes/magicLink.ts` - POST /redeem with rate limiting and atomic token consumption
- `apps/api/src/routes/invites.ts` - Generates magic link token on invite creation, fires email
- `apps/api/src/server.ts` - Mounts magicLinkRouter at /api/auth/magic-link

## Decisions Made
- **Fire-and-dont-block email sending:** `sendMagicLinkEmail` is not awaited in invite creation. Email failures are logged but do not block the invite creation response. This means organizers always get the `magic_link_url` back and can manually share the link if email fails.
- **48-char nanoid for magic tokens:** Longer than 21-char invite codes for extra entropy on single-use sensitive tokens.
- **Email prefix as participant name:** When a participant redeems a magic link for the first time, the system derives their name from the email address prefix (part before `@`). This is a reasonable default that can be changed later.
- **Returning participant path:** If the invite already has `status='accepted'` and a `participant_id`, the redemption reuses the existing participant record and generates fresh tokens (re-authentication scenario).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

To send real emails in production, configure these environment variables in `apps/api/.env`:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SMTP_FROM=Gatherly <noreply@yourdomain.com>
FRONTEND_URL=https://yourdomain.com
```

For local development, MailHog or Mailpit work out of the box (default host=localhost, port=1025).

## Next Phase Readiness
- Magic link token generation and email sending are complete
- Token redemption endpoint is live at POST /api/auth/magic-link/redeem
- Ready for 09-03: Frontend `/magic-link/:token` page that calls the redemption endpoint and stores the access token

---
*Phase: 09-magic-link-access*
*Completed: 2026-02-15*
