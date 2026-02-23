# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.1 — Phase 12: Authentication Screens

## Current Position

Phase: 12 of 18 (Authentication Screens) — in progress
Plan: 1 of 2 complete (12-01 done)
Status: 12-01 complete ✓, 12-02 ready to execute
Last activity: 2026-02-23 — Completed 12-01-PLAN.md (auth foundation + login screen)

Progress: [█░░░░░░░░░░░░░░░░░░░] ~13% — v2.1 Phase 12 in progress (3 plans / 8 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 30 (27 v2.0 + 3 v2.1)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v2.0 (1–10) | 27 | — | — |
| v2.1 Phase 11 | 2/2 | ~8m | ~4m |
| v2.1 Phase 12 | 1/2 | ~6m | ~6m |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- GlueStack UI over Konsta UI — already installed and scaffolded; Konsta was v2.0 plan
- Expo Router for navigation — file-based routing, matches React Router mental model
- Screen templates required before implementing any screen — if missing, ask user to create it
- apps/gatherly-mobile nested .git removed — monorepo pattern, parent repo tracks all files directly
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- signOutCallback pattern — client.ts interceptor calls AuthContext's signOut then router.replace on 401
- 2-arg signIn(accessToken, user) — no refreshToken in body (HttpOnly cookie pattern)
- Use `npm install` in gatherly-mobile — pnpm virtual store dir length mismatch makes pnpm unusable for mobile app installs

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 15: My Wishlist template MISSING — must request from user before implementing
- Phase 16: Event Wishlists template MISSING — must request from user before implementing
- Phase 17: Join Event template MISSING — must request from user before implementing
- Phase 18: Organizer Invite Management template MISSING — must request from user; backend endpoint may also be missing

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 12-01-PLAN.md — auth foundation, login screen, SecureStore AuthContext, Log Out button
Resume file: None

Next step: Execute 12-02-PLAN.md — Register screen (builds on AuthContext + _layout.tsx patterns from 12-01)
