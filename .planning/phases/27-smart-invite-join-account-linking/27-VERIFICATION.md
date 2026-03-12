---
phase: 27-smart-invite-join-account-linking
verified: 2026-03-12T07:24:27Z
status: passed
score: 5/5 must-haves verified
---

# Phase 27: Smart Invite Join + Account Linking Verification Report

**Phase Goal:** Existing account holders who receive a magic link are automatically joined to the event under their real account (not a participant-only session). Magic-link-only participants who later register get their participant records linked to their new account, so the event appears in their events list.

**Verified:** 2026-03-12T07:24:27Z
**Status:** passed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Existing user who redeems a magic link gets a user-scoped JWT (userId > 0) | VERIFIED | magicLink.ts lines 142-188: email lookup against users table; on match calls generateTokens({userId: matchedUser.id}) with early return before participant path |
| 2 | New user who registers has prior accepted invites linked via participants.user_id | VERIFIED | auth.ts lines 79-93: UPDATE participants SET user_id=\ WHERE id IN (subquery on accepted invites by email, p.user_id IS NULL), wrapped in try/catch |
| 3 | Events list includes events where user is a participant (not just organizer) | VERIFIED | events.ts lines 68-70: OR EXISTS (SELECT 1 FROM participants p2 WHERE p2.event_id = e.id AND p2.user_id = \) added to organizer-branch WHERE clause |
| 4 | Mobile app handles user-scoped response from magic link redemption | VERIFIED | app/api/auth.ts lines 82-93: branch on id in userData AND NOT participantId in userData, constructs full User with real id, email, name, role |
| 5 | Mobile app handles participant-scoped response (unchanged behavior) | VERIFIED | app/api/auth.ts lines 96-116: participant path unchanged - constructs User with id: participantId, email empty, participantId, eventId, eventName |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| apps/api/src/db/migrations/012-phase27-account-linking.sql | user_id column + index | VERIFIED | Line 5: ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL; line 7: CREATE INDEX IF NOT EXISTS idx_participants_user_id |
| apps/api/src/db/schema.sql | Canonical schema with user_id on participants | VERIFIED | Line 17: user_id INTEGER REFERENCES users(id) ON DELETE SET NULL in participants table; line 140: index present |
| apps/api/src/routes/magicLink.ts | User-scoped token path in /redeem | VERIFIED | Both generateTokens and generateParticipantTokens imported (lines 7-8); user-scoped path at lines 162-186 using generateTokens |
| apps/api/src/routes/auth.ts | Post-registration participant linking | VERIFIED | Lines 79-93: UPDATE participants SET user_id after INSERT INTO users, non-fatal try/catch |
| apps/api/src/routes/events.ts | Expanded event query including participant events | VERIFIED | Lines 68-70: EXISTS subquery with p2.user_id=\ in organizer branch |
| apps/gatherly-mobile/app/api/auth.ts | Dual-shape redeemMagicLink handler | VERIFIED | Union type on response (lines 56-76), branch detection via id-in-userData guard (line 82) |
| apps/gatherly-mobile/app/magic-link/[token].tsx | Navigation for both response shapes | VERIFIED | Lines 32-48: calls redeemMagicLink, passes result to signIn; eventId used for navigation (line 55) |

All artifacts: EXISTS, SUBSTANTIVE, WIRED.

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| apps/api/src/routes/magicLink.ts | tokenService.ts | generateTokens call (user-scoped) | WIRED | Line 162: generateTokens({userId: matchedUser.id, email, role}) with early return before participant path |
| apps/api/src/routes/auth.ts | participants table | UPDATE participants SET user_id after INSERT INTO users | WIRED | Lines 80-88: UPDATE with subquery joining invites by email, filtered to accepted and unlinked |
| apps/api/src/routes/events.ts | participants table | EXISTS subquery on p2.user_id=\ | WIRED | Lines 68-70: inside organizer WHERE branch; subquery p2 alias locally scoped, no conflict with outer p2 alias at line 51 |
| apps/gatherly-mobile/app/api/auth.ts | AuthContext signIn | signIn(accessToken, user) with correct User shape | WIRED | magic-link/[token].tsx line 35 calls signIn(response.accessToken, response.user); AuthContext imports User from auth.ts; optional fields satisfy both shapes |
| apps/gatherly-mobile/app/magic-link/[token].tsx | app/api/auth.ts | redeemMagicLink call | WIRED | Line 33: authApi.redeemMagicLink(token) result flows directly into signIn and navigation |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Existing account magic link yields user-scoped JWT | SATISFIED | Backend detects user by email match, issues generateTokens output |
| No-account participant magic link yields participant JWT (unchanged) | SATISFIED | Fall-through to generateParticipantTokens path preserved |
| Post-registration participant linking | SATISFIED | auth.ts register route links accepted invites by email |
| Events list shows participant events | SATISFIED | events.ts EXISTS subquery covers participant.user_id match |
| Mobile dual-shape handling | SATISFIED | Type-safe union plus runtime branch in redeemMagicLink |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/api/src/routes/magicLink.ts | 44, 53 | console.log debug lines | Warning | Logs raw token string to stdout; production hardening concern, not a goal-achievement blocker |

No blockers found.

---

### Human Verification Required

None required to confirm goal achievement. Optional smoke tests for confidence:

#### 1. Existing user redeems magic link

**Test:** Send invite to email matching a registered user; open magic link on mobile device
**Expected:** App signs in with full user session (real name and email visible); invited event appears in events list
**Why human:** Requires live database and auth flow

#### 2. New user registers after prior magic link acceptance

**Test:** Accept a magic link invite without an account, then register with the same email
**Expected:** The invited event appears in the events list immediately after registration
**Why human:** Requires two-step flow across separate sessions

#### 3. Participant-only path unchanged

**Test:** Open magic link for an email address with no registered account
**Expected:** Participant session granted; only the one event visible
**Why human:** Regression check on unchanged participant path

---

## Gaps Summary

No gaps. All five must-have truths verified against actual code, not SUMMARY claims.

- Migration file 012-phase27-account-linking.sql exists with correct ALTER TABLE and CREATE INDEX.
- schema.sql canonical definition includes user_id on participants with the index.
- magicLink.ts /redeem has two clearly separated code paths: user-scoped at lines 142-186 (early return after generateTokens) and participant-scoped at lines 191-215 (fallthrough after no user match).
- auth.ts /register links orphaned participants before issuing tokens at lines 79-93.
- events.ts GET / organizer branch includes EXISTS subquery for participant.user_id at lines 68-70.
- Mobile auth.ts redeemMagicLink detects response shape via TypeScript union plus runtime guard and constructs the correct User object for signIn.
- Magic-link screen passes result to signIn and navigates by eventId, which is present in both response shapes.

---

_Verified: 2026-03-12T07:24:27Z_
_Verifier: Claude (gsd-verifier)_
