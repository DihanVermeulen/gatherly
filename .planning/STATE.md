# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.1 — Phase 14 complete, Phase 15 pending template from user

## Current Position

Phase: 14 of 18 (Edit Event Screen) — complete
Plan: 2 of 2 complete (14-01 done, 14-02 done)
Status: Phase complete
Last activity: 2026-02-25 — Completed 14-02-PLAN.md (edit-event.tsx overhaul)

Progress: [████░░░░░░░░░░░░░░░░] ~28% — v2.1 Phase 14 complete (8 plans / 8 phases remaining)

## Performance Metrics

**Velocity:**
- Total plans completed: 34 (27 v2.0 + 7 v2.1)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v2.0 (1–10) | 27 | — | — |
| v2.1 Phase 11 | 2/2 | ~8m | ~4m |
| v2.1 Phase 12 | 2/2 | ~12m | ~6m |
| v2.1 Phase 13 | 2/2 | ~9m | ~4.5m |
| v2.1 Phase 14 | 2/2 | ~7m | ~3.5m |

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
- EventsProvider inside GluestackUIProvider wrapping Stack — ensures all authenticated screens have events context
- eventToDeleteId state pattern — store id before confirm dialog, dispatch after user confirmation
- Type aliases (Event/WishlistItem) in events.ts before eventsApi — prevents binding to global DOM Event type
- Filter pills derive Active/Planning from assignments field: null = Planning, non-null = Active
- eventIndex-for-hero-color: Use events.findIndex (not find) to get index for hero colour cycling — visual consistency between list and details
- Inline style for dynamic hex heroColor: NativeWind cannot use dynamic hex values as Tailwind className at runtime
- Assignment card has three states: null (not generated), empty array (no match), populated (has assignment, show toggle)
- Role badge shows Organizer only when name === user?.name AND user.role === organizer
- PUT /api/events/:id confirmed to accept couples field — deletes all existing couples and re-inserts full array (full-array-replace)
- Manage Exclusions save pattern: eventsApi.update(id, { couples }) then refreshEvents() then router.back()
- react-qr-code@2.0.18 installed in gatherly-mobile
- ActivityIndicator (not ButtonSpinner) in Pressable context — ButtonSpinner requires GlueStack Button parent context
- giftCount is local UI state only — not stored in TEvent, always initializes to 1
- Immediate save pattern for toggles: onValueChange calls API directly, no useEffect debounce
- getCodes returns Record<string,string> — always transform via Object.entries().map() to array
- removeParticipant takes participant name string, not numeric ID — backend route: DELETE /events/:id/participants/:name

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 15: My Wishlist template MISSING — must request from user before implementing
- Phase 16: Event Wishlists template MISSING — must request from user before implementing
- Phase 17: Join Event template MISSING — must request from user before implementing
- Phase 18: Organizer Invite Management template MISSING — must request from user; backend endpoint may also be missing

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 14-02-PLAN.md — edit-event.tsx fully rewritten (651 lines, all interactions)
Resume file: None

Next step: Phase 15 — request My Wishlist screen template from user before proceeding
