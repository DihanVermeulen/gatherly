---
status: complete
phase: 09-magic-link-access-for-invited-members-with-restricted-permissions
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md
started: 2026-02-16T00:00:00Z
updated: 2026-02-16T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Generate Invite Returns Magic Link URL
expected: POST /api/events/:id/invites response includes magic_link_url field visible in Network tab
result: pass

### 2. Magic Link Token is Single-Use
expected: |
  Copy the magic_link_url from the invite response. Extract the token (last path segment).
  Call POST /api/auth/magic-link/redeem with body {"token": "<token>"} twice.
  First call returns 200 with access_token. Second call returns 410 Gone (token already consumed).
result: pass

### 3. Magic Link Redemption Returns Participant JWT
expected: |
  POST /api/auth/magic-link/redeem with a valid token returns HTTP 200 with
  {"access_token": "...", "participant": {...}}. The access_token JWT payload
  (decoded at jwt.io) contains role="participant", participantId, and eventId claims.
result: pass

### 4. Participant Cannot Create Events
expected: |
  Using the participant access_token from test 3 as Bearer token,
  POST /api/events with any event body returns HTTP 403 Forbidden.
  (Not 401 — the token is valid, but the role is wrong.)
result: pass

### 5. Participant Cannot Manage Invites
expected: |
  Using the participant access_token, GET /api/events/:id/invites returns HTTP 403.
  POST /api/events/:id/invites also returns 403. Participants cannot list or create invites.
result: pass

### 6. Organizer Can Still Create Events
expected: |
  Using an organizer account's access_token (logged-in user), POST /api/events
  with a valid event body returns HTTP 201. Organizer mutations are unaffected
  by the requireOrganizer middleware.
result: pass

### 7. Events List Remains Publicly Readable
expected: |
  GET /api/events with no Authorization header returns HTTP 200 with the events list.
  The read-only event endpoints (list and detail) remain publicly accessible
  (optionalAuth pattern preserved).
result: pass

### 8. Gifts Accessible to Participants
expected: |
  Using the participant access_token, GET /api/events/:id/gifts returns HTTP 200
  with the gift list. Gift read and claim operations are not blocked for participants.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
