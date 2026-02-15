---
phase: 09-magic-link-access-for-invited-members-with-restricted-permissions
verified: 2026-02-15T07:45:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 9: Magic Link Access for Invited Members Verification Report

**Phase Goal:** Invited members receive magic links via email and gain restricted access to events -- they can view events and event details, manage their own wishlist items, and claim gifts, but cannot perform admin operations (create/edit/delete events or manage participants)
**Verified:** 2026-02-15T07:45:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | magic_link_tokens table exists with invite_id FK, token_hash, expires_at | VERIFIED | apps/api/src/db/schema.sql lines 127-133: CREATE TABLE magic_link_tokens with all required columns |
| 2  | refresh_tokens has nullable participant_id with CHECK constraint | VERIFIED | schema.sql lines 113-124: user_id nullable, participant_id FK to participants, CHECK constraint enforces mutual exclusivity |
| 3  | TokenPayload includes optional participantId and eventId fields | VERIFIED | tokenService.ts lines 5-11: participantId optional number and eventId optional number present |
| 4  | generateParticipantTokens() creates JWTs and stores refresh token with participant_id | VERIFIED | tokenService.ts lines 68-115: payload with role=participant; INSERT INTO refresh_tokens (participant_id, token_hash, expires_at) |
| 5  | nodemailer is installed as a dependency | VERIFIED | apps/api/package.json: nodemailer ^8.0.1 and @types/nodemailer ^7.0.9 present |
| 6  | Invite creation generates a magic link token and sends email | VERIFIED | invites.ts lines 77-96: 48-char nanoid, SHA-256 hash stored, sendMagicLinkEmail fire-and-forget |
| 7  | POST /api/auth/magic-link/redeem returns access token + refresh cookie | VERIFIED | magicLink.ts lines 35-162: 200 with accessToken + user object, HttpOnly refreshToken cookie |
| 8  | Magic link tokens are single-use via DELETE + RETURNING | VERIFIED | magicLink.ts lines 54-58: DELETE FROM magic_link_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING invite_id |
| 9  | Tokens expire after 24 hours; POST-only redemption blocks email bots | VERIFIED | invites.ts line 82: Date.now() + 24x60x60x1000; SQL enforces expires_at > NOW(); only POST /redeem defined |
| 10 | Email failure does not block invite creation | VERIFIED | invites.ts line 95: sendMagicLinkEmail without await; emailService.ts try/catch does not rethrow |
| 11 | Participant-role gets 403 on admin routes; can read events and manage gifts; organizers unaffected | VERIFIED | Event mutations + invite management have requireOrganizer; GET routes use optionalAuth; gifts.ts has no requireOrganizer |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| apps/api/src/db/migrations/009-magic-link-tokens.sql | magic_link_tokens table + refresh_tokens ALTER | VERIFIED | 35 lines, creates magic_link_tokens, alters refresh_tokens for participant_id with CHECK constraint, adds indexes |
| apps/api/src/db/schema.sql | magic_link_tokens and refresh_tokens with participant_id | VERIFIED | 197 lines, both tables present with full definitions and all required indexes |
| apps/api/src/services/tokenService.ts | generateParticipantTokens, revokeParticipantTokens, extended TokenPayload | VERIFIED | 195 lines, all 8 expected exports present, TokenPayload has optional participantId and eventId |
| apps/api/src/middleware/auth.ts | req.user extended with participantId and eventId | VERIFIED | 114 lines, both authenticateJWT and optionalAuth propagate participant claims via conditional spread |
| apps/api/src/services/emailService.ts | sendMagicLinkEmail using nodemailer, fire-and-dont-block | VERIFIED | 78 lines, uses nodemailer transporter, wraps in try/catch, does not rethrow |
| apps/api/src/routes/magicLink.ts | POST /redeem with rate limiting, atomic token consumption, participant JWT | VERIFIED | 165 lines, rate limited, DELETE + RETURNING, handles pending and accepted invites, returns accessToken + sets cookie |
| apps/api/src/routes/invites.ts | POST generates magic link token + email; 3 mgmt routes have requireOrganizer | VERIFIED | 336 lines, magic link generation at lines 77-96, all 3 auth routes have authenticateJWT + requireOrganizer |
| apps/api/src/middleware/requireOrganizer.ts | Returns 403 for non-organizer, 401 for unauthenticated | VERIFIED | 25 lines, checks req.user presence (401) then role (403 if not organizer) |
| apps/api/src/routes/events.ts | Mutation routes have requireOrganizer; GET routes use optionalAuth | VERIFIED | All 8 required routes have requireOrganizer; GET / and GET /:id use optionalAuth only |
| apps/api/src/server.ts | magicLinkRouter mounted at /api/auth/magic-link | VERIFIED | Line 37: mounts magicLinkRouter at /api/auth/magic-link after /api/auth |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| tokenService.ts | refresh_tokens table | INSERT with participant_id | VERIFIED | Line 110: INSERT INTO refresh_tokens (participant_id, token_hash, expires_at) VALUES ($1, $2, $3) |
| auth.ts | tokenService.ts | verifyAccessToken returns extended payload | VERIFIED | authenticateJWT calls verifyAccessToken, spreads participantId and eventId onto req.user |
| invites.ts | emailService.ts | sendMagicLinkEmail after invite creation | VERIFIED | Line 95: if (invite.email) sendMagicLinkEmail(invite.email, magicLinkUrl, event.name) without await |
| magicLink.ts | tokenService.ts | generateParticipantTokens after redemption | VERIFIED | Line 136: await generateParticipantTokens({participantId, eventId, participantName}) |
| magicLink.ts | magic_link_tokens table | DELETE + RETURNING atomic consumption | VERIFIED | Lines 54-58: atomic DELETE + RETURNING, returns 401 if no rows found |
| events.ts | requireOrganizer.ts | Applied after authenticateJWT on mutation routes | VERIFIED | POST/PUT/DELETE events and participants/couples/generate/codes routes all have both middlewares |
| requireOrganizer.ts | auth.ts | Reads req.user.role set by authenticateJWT | VERIFIED | req.user.role check reads role field set by authenticateJWT |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | -- | -- | -- | No anti-patterns detected |

No TODO/FIXME comments, placeholder returns, or empty handler stubs found in any phase 9 files.

---

### Human Verification Required

Two items cannot be verified programmatically:

#### 1. Magic Link Email Delivery in Development

**Test:** Start MailHog or Mailpit on localhost:1025, create an invite via POST /api/events/:id/invites with an email field, check the mail server inbox.
**Expected:** HTML email arrives with subject "You are invited to {eventName} on Gatherly" containing a CTA button linking to http://localhost:3000/magic-link/{48-char-token}
**Why human:** Cannot verify SMTP connection or email delivery without a running mail server. The nodemailer transporter and sendMagicLinkEmail are structurally correct, but actual delivery requires runtime verification.

#### 2. Magic Link Redemption End-to-End Flow

**Test:** Create an invite, extract magic_link_url from the response, POST the token portion to POST /api/auth/magic-link/redeem. Then attempt to POST the same token again.
**Expected:** First redemption returns 200 with accessToken and participant user object; second redemption returns 401 "Invalid or expired magic link" (single-use enforcement).
**Why human:** The atomic DELETE + RETURNING logic is structurally correct but requires a running database to verify single-use enforcement and cookie behavior at runtime.

---

### Notes on Design Boundaries

**Gift mutation routes** (PUT and DELETE /events/:id/gifts/:giftId) use only authenticateJWT -- no requireOrganizer. Per the 09-03 plan spec, gift routes were intentionally left without requireOrganizer so participants can manage gifts. The plan states: do not add requireOrganizer to gift routes. This is a design choice, not a gap.

**Magic link route mount order:** magicLinkRouter is mounted at /api/auth/magic-link after the /api/auth router in server.ts. Express prefix-based matching means /api/auth/magic-link correctly intercepts /api/auth/magic-link/redeem requests. Verified safe.

---

## Gaps Summary

None. All 11 must-haves verified. All required artifacts exist, are substantive, and are correctly wired. The phase goal is achieved.

---

_Verified: 2026-02-15T07:45:00Z_
_Verifier: Claude (gsd-verifier)_
