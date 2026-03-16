# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.2 — Planning next milestone

## Current Position

Phase: Not started
Plan: Not started
Status: Ready to plan next milestone
Last activity: 2026-03-16 — v2.1 Gatherly Mobile milestone complete (archived)

Progress: [████████████████████] v2.1 complete

## Performance Metrics

**Velocity:**
- Total plans completed: 71 (27 v2.0 + 10 v2.1-core + 24 v2.1-extended)
- Average duration: —
- Total execution time: —

**By Phase (v2.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v2.0 (1–10) | 27 | — | — |
| v2.1 Phase 11 | 2/2 | ~8m | ~4m |
| v2.1 Phase 12 | 2/2 | ~12m | ~6m |
| v2.1 Phase 13 | 2/2 | ~9m | ~4.5m |
| v2.1 Phase 14 | 2/2 | ~7m | ~3.5m |
| v2.1 Phase 15 | 2/2 | ~7m | ~3.5m |
| v2.1 Phase 16 | 2/2 | — | — |
| v2.1 Phase 17 | 2/2 | ~10m | ~5m |
| v2.1 Phase 19 | 5/5 | ~18m | ~4.5m |

*Updated after each plan completion*

## Accumulated Context

### Decisions (active carry-forward)

- GlueStack UI — use components from components/ui/; no custom UI primitives
- Screen templates required before implementing any screen — if missing, ask user to create it
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- Use `npm install --ignore-scripts` in gatherly-mobile — pnpm virtual store dir length mismatch
- EventsProvider key={session ?? 'unauthenticated'} OUTSIDE Stack.Protected — React destroys/remounts on session change
- participantId-as-session-discriminant: user.participantId !== undefined = magic-link participant; absence = full account user — role field dropped from JWT, DB, and all clients
- /lookup endpoint read-only pattern: POST /api/auth/magic-link/lookup — no participant creation, no token consumption
- pendingToken pattern for name-prompt: re-calls /redeem with user-supplied participantName
- JoinState machine pattern: explicit union type + switch in renderContent()
- SQLite singleton pattern: module-level let db = null in database.ts
- isConnected !== false pattern for offline detection — null (NetInfo initializing) treated as online
- app.json YOUR_DOMAIN placeholder pattern — replace with production domain before EAS Build
- fire-and-forget emails: sendX() called without await after route commits

### Pending Todos

- `.planning/todos/pending/2026-03-10-phase-26-planning.md` — Plan Phase 26 (Public Wishlist + Push Notifications + Groups)

### Tech Debt

- join.tsx: add `await refreshEvents()` after `invitesApi.accept()` before `setJoinState("success")` (GAP-01 from v2.1 audit)
- assetlinks.json SHA-256 fingerprint is a placeholder — replace before Android App Links work in production
- associatedDomains uses YOUR_DOMAIN placeholder — replace before iOS Universal Links work in production
- modules-config, polls, rsvp routes not registered in _layout.tsx Stack.Protected (cosmetic header config only)

### Pending DB Migrations for New Environments

- Migration 012: `psql -d gatherly -f apps/api/src/db/migrations/012-phase27-account-linking.sql`
- Migration 013: `psql -d gatherly -f apps/api/src/db/migrations/013-remove-role-from-users.sql` — also rotate JWT_SECRET + REFRESH_SECRET

## Session Continuity

Last session: 2026-03-16 UTC
Stopped at: v2.1 milestone archived and tagged
Resume file: None

Next step: `/gsd:new-milestone` to define v2.2 goals, requirements, and roadmap.
