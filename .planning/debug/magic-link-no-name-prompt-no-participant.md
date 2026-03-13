---
status: resolved
trigger: "Magic link join — user not prompted for name, participant name is wrong"
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Root Cause

Two compounding defects:

### Defect 1 — No name prompt in mobile UI

`apps/gatherly-mobile/app/magic-link/[token].tsx` goes directly from token redemption to sign-in with zero name collection. The screen has no TextInput, no name state, no "What's your name?" step. The state machine is `loading | success | invalid | error` — nothing in between.

### Defect 2 — Backend fabricates participant name

`apps/api/src/routes/magicLink.ts` lines 99–138 creates the participant record using the email address prefix as the name (e.g. `"alice"` from `"alice@example.com"`). If the invite has no email (QR/link invite), the fallback name is the hardcoded string `"Participant"`. No `participantName` field is accepted from the client.

## Evidence

- `[token].tsx`: 134-line component with no TextInput, no name state, no name prompt at any point
- `magicLink.ts` line 106–110: `emailPrefix = invite.invite_email.split("@")[0]` with `"Participant"` fallback
- `magicLink.ts` request body: only `{ token }` consumed — no `participantName` parameter
- `join.tsx` (invite-code flow): collects name correctly via `invitesApi.accept(token, user.name, ...)` but is a completely separate path

## Files Involved

- `apps/gatherly-mobile/app/magic-link/[token].tsx` — missing name collection step
- `apps/api/src/routes/magicLink.ts` — no `participantName` accepted from client

## Fix Direction

1. Mobile `[token].tsx`: After successful redeem returning participant-scoped token, add `"name-prompt"` state — show TextInput, user confirms name, then proceed to sign-in
2. Backend `/redeem`: Accept optional `participantName` in request body, use it instead of email-prefix derivation when creating participant on first use
