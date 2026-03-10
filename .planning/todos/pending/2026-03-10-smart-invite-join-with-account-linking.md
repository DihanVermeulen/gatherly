---
created: 2026-03-10T00:00
title: Smart invite join — link existing accounts and promote magic-link users
area: auth
files:
  - apps/api/src/routes/magicLink.ts
  - apps/gatherly-mobile/app/magic-link/
  - apps/gatherly-mobile/app/api/auth.ts
---

## Problem

Currently the invite flow is magic-link only. Two gaps exist:

1. **Existing account holders** who receive an invite magic link still have to go through the magic-link redemption flow even though they already have an account. They should be able to simply be joined to the event by authenticating normally — entering the magic link should attach them to the event automatically once they are signed in.

2. **Magic-link-only participants** (no account) who later create a full Gatherly account from within the event context should have that new account automatically linked to their existing participant record. The event should then appear in their events list, clearly marked as a participant (not organiser) event.

## Solution

TBD — rough approach:

- On magic link redemption, check if a `users` row exists for the invite's email. If yes, add them to the event as a participant under their user account (skip anonymous participant path).
- Store a `pending_user_email` or `pending_invite_token` during the sign-up flow so that on account creation completion the backend can find matching participant records and re-assign them to the new `user_id`.
- Mobile events list needs a visual distinction for "participant" events vs "organiser" events (role badge already partially exists per STATE.md decisions).
