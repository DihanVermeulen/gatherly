---
status: diagnosed
phase: 27-smart-invite-join-account-linking
source: 27-01-SUMMARY.md, 27-02-SUMMARY.md
started: 2026-03-12T08:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Magic link redemption for existing user issues full session
expected: When a registered Gatherly user opens a magic link invite (sent to their account email), /redeem returns a full user-scoped JWT. The mobile app signs them in with their real account (id, email, name, role) — not a participant-only session.
result: issue
reported: "No email gets sent, because we don't pass in an email. Plus using the magic link does not automatically sign me in as well"
severity: blocker

### 2. Existing user magic link — event appears in events list
expected: After an existing user redeems a magic link (and is signed in with their real account), the joined event appears in their events list on the Events screen.
result: issue
reported: "It takes me to the event, but I can't go back, and also my participant isn't added to the event."
severity: blocker

### 3. Post-registration participant linking
expected: A user who previously joined an event via magic link (participant-only session) and then registers a full account sees that event appear in their Events list immediately after registration — no manual re-join needed.
result: issue
reported: "When accessing the magic link I'm not even asked for my name or anything... When I join a participant isn't even added to the event"
severity: blocker

### 4. Events list shows participant-joined events
expected: A registered user who has joined events as a participant (not organizer) sees those events in the Events screen, alongside any events they organised.
result: skipped
reason: User stopped testing after 3 blockers — join flow fundamentally broken

### 5. No-account user magic link flow unchanged
expected: A user with no Gatherly account who redeems a magic link still gets a participant-only session (no breaking change) — they can view the event but cannot access full account features.
result: skipped
reason: Skipped — join flow broken at a more fundamental level

### 6. Mobile dual-shape handler — user-scoped response
expected: When /redeem returns a user-scoped response (id, email, name, role, eventId, eventName), the mobile app correctly maps it to a full AuthResponse — the user lands on the Events screen with their real identity.
result: skipped
reason: Skipped — dependent on the join/redeem flow which is broken

### 7. Mobile dual-shape handler — participant-scoped response unchanged
expected: When /redeem returns a participant-scoped response (participantId, participantName, eventId, eventName), the mobile app still handles it correctly — participant is signed in with their participant session as before Phase 27.
result: skipped
reason: Skipped — dependent on the join/redeem flow which is broken

## Summary

total: 7
passed: 0
issues: 3
pending: 0
skipped: 4

## Gaps

- truth: "When a registered user redeems a magic link, /redeem returns a full user-scoped JWT and the mobile app signs them in with their real account"
  status: failed
  reason: "User reported: No email gets sent, because we don't pass in an email. Plus using the magic link does not automatically sign me in as well"
  severity: blocker
  test: 1
  root_cause: "invite_email is NULL for QR/link invites — /redeem's user-lookup block (magicLink.ts lines 142-188) is skipped. Falls through to participant-scoped JWT. signIn() IS called correctly but with participant identity (email='')."
  artifacts:
    - path: "apps/api/src/routes/magicLink.ts"
      issue: "user-lookup block unreachable when invite_email IS NULL"
    - path: "apps/api/src/routes/invites.ts"
      issue: "stores email || null at invite creation — QR/link invites store NULL"
  missing:
    - "Backend /redeem should accept optional email from client as fallback when invite_email is NULL"
    - "Mobile client should pass currently-authenticated user's email (if signed in) when calling redeemMagicLink"
  debug_session: ".planning/debug/magic-link-no-email-no-autosignin.md"

- truth: "Magic link join flow prompts for participant name and adds the user as a participant to the event"
  status: failed
  reason: "User reported: When accessing the magic link I'm not even asked for my name or anything... When I join a participant isn't even added to the event"
  severity: blocker
  test: 3
  root_cause: "[token].tsx has no name collection step (no TextInput, no name state). Backend /redeem fabricates participant name from email prefix or hardcodes 'Participant' — accepts no participantName from client."
  artifacts:
    - path: "apps/gatherly-mobile/app/magic-link/[token].tsx"
      issue: "missing name-prompt state — no TextInput, no name collection anywhere in the flow"
    - path: "apps/api/src/routes/magicLink.ts"
      issue: "participant name derived from email prefix or hardcoded 'Participant' — no participantName accepted from client"
  missing:
    - "Add name-prompt state to [token].tsx after successful participant-scoped redemption"
    - "Backend /redeem should accept optional participantName in request body"
  debug_session: ".planning/debug/magic-link-no-name-prompt-no-participant.md"

- truth: "After redeeming a magic link, the joined event appears in the events list and the user can navigate back"
  status: failed
  reason: "User reported: It takes me to the event, but I can't go back, and also my participant isn't added to the event."
  severity: blocker
  test: 2
  root_cause: "Two bugs in [token].tsx: (1) router.replace() removes screen from nav stack + gestureEnabled:false disables swipe-back; (2) refreshEvents() never called after signIn() so stale event list doesn't include newly joined event."
  artifacts:
    - path: "apps/gatherly-mobile/app/magic-link/[token].tsx"
      issue: "router.replace() on line 55 and gestureEnabled:false on line 63 — no back navigation possible. No refreshEvents() call after signIn()."
  missing:
    - "Change router.replace() to router.push() (or navigate to events tab)"
    - "Remove gestureEnabled:false"
    - "Call refreshEvents() after signIn() before navigation"
  debug_session: ".planning/debug/magic-link-join-no-back-no-participant.md"
