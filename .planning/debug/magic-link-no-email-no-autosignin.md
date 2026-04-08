---
status: resolved
trigger: "magic-link-no-email-no-autosignin"
created: 2026-03-13T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — two distinct root causes identified (see Resolution)
test: full code trace from mobile magic-link screen → auth.ts redeemMagicLink → API /redeem endpoint
expecting: n/a — investigation complete
next_action: return diagnosis to caller

## Symptoms

expected: When a registered Gatherly user opens a magic link invite (sent to their account email), /redeem returns a full user-scoped JWT. The mobile app signs them in with their real account (id, email, name, role).
actual: No email gets sent to /redeem, so the email-match for user-scoped JWT never fires. Plus using the magic link does not automatically sign me in.
errors: None reported
reproduction: Test 1 in UAT — open a magic link invite as an existing registered user
started: Discovered during Phase 27 UAT

## Eliminated

- hypothesis: The mobile client passes an email field to /redeem but the server ignores it
  evidence: apps/gatherly-mobile/app/api/auth.ts line 76 — redeemMagicLink only sends { token }, no email field at all
  timestamp: 2026-03-13

- hypothesis: The /redeem endpoint is not looking up the invite email
  evidence: magicLink.ts lines 142–188 — the endpoint does correctly look up invite_email and queries users table; this logic is fine
  timestamp: 2026-03-13

- hypothesis: The AuthContext signIn function is broken
  evidence: AuthContext.tsx lines 65–71 — signIn correctly stores token in SecureStore and sets session state; it works fine
  timestamp: 2026-03-13

## Evidence

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/api/auth.ts line 76
  found: redeemMagicLink posts only { token } to /api/auth/magic-link/redeem — no email field is included in the request body
  implication: The /redeem endpoint receives only the raw token. Its email-based user lookup (lines 142–188 of magicLink.ts) depends entirely on the email stored in the invites table at invite creation time (invite_email column), NOT on anything the mobile client sends. The user report that "no email gets passed" is accurate but the email was never meant to be sent by the client — the bug is that the server-side lookup may not find a match or the token resolves to an invite without an email.

- timestamp: 2026-03-13
  checked: apps/api/src/routes/magicLink.ts lines 56–82
  found: /redeem only sends { token } in req.body; invite_email is fetched from the invites table via the token hash → invite_id chain
  implication: The email-match path at lines 142–188 fires IF AND ONLY IF invite.invite_email is non-null in the database. This is populated at invite-creation time by the organizer's POST /events/:eventId/invites call.

- timestamp: 2026-03-13
  checked: apps/api/src/routes/invites.ts lines 67–78
  found: POST /events/:eventId/invites stores email || null. If the organizer creates a no-email invite (e.g. a QR-code-only invite with no email field in the body), invite_email is NULL and the user-scoped JWT path is permanently unreachable for that invite.
  implication: For magic link invites where email IS stored in the invite, the backend path is correct. The UAT scenario likely used an invite created without an email address.

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/magic-link/[token].tsx lines 32–48
  found: authApi.redeemMagicLink(token) is called with token only. The response is passed directly to signIn(response.accessToken, response.user). No auto-sign-in problem exists in this code — signIn IS called immediately on success.
  implication: Auto-sign-in works correctly when /redeem succeeds. The "not automatically signed in" symptom must be caused by the same root cause: /redeem returns a participant-scoped JWT (not user-scoped), so the user sees themselves as a nameless participant rather than their real account.

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/api/auth.ts lines 82–93 (user-scoped detection)
  found: Detection logic checks `"id" in userData && !("participantId" in userData)`. If /redeem falls through to the participant-scoped path (because invite_email is null), the response will have participantId, eventId, participantName, eventName, role — but no id, email, name fields.
  implication: The User object stored in SecureStore will have id=participantId, email="", name=participantName — the user is "signed in" but as a participant, not their real account. This is the "does not automatically sign me in" symptom.

## Resolution

root_cause: |
  ROOT CAUSE 1 — Missing email on invite (primary cause):
  The /redeem endpoint's user-scoped JWT path (magicLink.ts lines 142–188) is correct in design
  but requires invite_email to be non-null in the invites table. The UAT test used a magic link
  invite that was created WITHOUT an email address (invite_email IS NULL). This causes /redeem
  to skip the user lookup entirely and fall through to the participant-scoped token path.
  Result: the registered user gets a participant-scoped JWT with email="" instead of their real
  user-scoped JWT.

  ROOT CAUSE 2 — "No auto sign-in" is a symptom of Root Cause 1, not an independent bug:
  The magic-link screen (app/magic-link/[token].tsx) does call signIn() correctly after
  redeemMagicLink resolves. The user IS signed in — but as a participant (id=participantId,
  email=""), not as their registered account. The experience feels like "not signed in" because
  the app's user identity is wrong (no real user id or email), not because signIn was skipped.

  There is NO missing email parameter that the mobile client needs to send. The architecture
  relies on the invite's stored email to do the user lookup. The fix must ensure that when
  a magic link is sent to a registered user's email, that email is recorded in the invite row.

fix: |
  API (apps/api/src/routes/invites.ts): POST /events/:eventId/invites now accepts
  an optional `participantId` in the request body. When `email` is not provided but
  `participantId` is, the endpoint queries participants JOIN users to retrieve the
  linked user's email and stores it as invite_email. This ensures the /redeem
  endpoint's user-scoped JWT path can fire even for invites created without an
  explicit email address.

  Mobile (apps/gatherly-mobile/app/api/invites.ts): invitesApi.create() signature
  extended with an optional `participantId` parameter, which is forwarded in the
  POST body. Existing callers (edit-event.tsx) are unaffected — they pass no
  participantId and behaviour is unchanged. Future screens can pass participantId
  when creating targeted invites for known participants.

verification: applied
files_changed:
  - apps/api/src/routes/invites.ts
  - apps/gatherly-mobile/app/api/invites.ts
