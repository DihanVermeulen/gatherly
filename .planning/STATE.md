# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.4 Navigation & UX Overhaul — Phase 39: Navigation Architecture

## Current Position

Phase: 39 of 43 (Navigation Architecture)
Plan: — (not started)
Status: Roadmap created — ready to plan Phase 39
Last activity: 2026-04-08 — v2.4 roadmap created, phases 39–43 defined

Progress: [████████████████████████████████░░░░░] v2.4 Phase 39 ready

## Performance Metrics

**Velocity:**
- Total plans completed: 72 (27 v2.0 + 44 v2.1 + 1 v2.2)
- Average duration: ~5m
- Total execution time: —

**By Phase (v2.3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 34. Infrastructure | 2/2 done | — | — |
| 35. Paywall Components | 2/2 done | ~3m | ~1.5m |
| 36. Paywall Wiring | 2/2 done | ~5m | ~2.5m |
| 37. Paywall Polish | 1/1 done | — | — |
| 38. Checkout + Payment Success | 2/2 done | — | — |

*Updated after each plan completion*

## Accumulated Context

### Decisions (active carry-forward)

- GlueStack UI — use components from components/ui/; no custom UI primitives
- Screen templates required before implementing any screen — if missing, ask user to create it
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- Use `npm install --ignore-scripts` in gatherly-mobile — pnpm virtual store dir length mismatch
- participantId-as-discriminant: user.participantId !== undefined = magic-link participant; absence = full account user
- fire-and-forget emails: sendX() called without await after route commits
- v2.3 tier model: planTier is 'free' | 'premium' — 'standard' is incorrect and must not appear in code
- v2.3 PaywallBanner: Pressable + native Text (not GlueStack Button) — amber hex conflicts with NativeWind variants
- isFree derivation pattern: (event?.planTier ?? 'free') === 'free' — default to free defensively

### Pending Todos

- `.planning/todos/pending/2026-03-10-phase-26-planning.md` — Plan Phase 26 (Public Wishlist + Push Notifications + Groups) — deferred to v2.3+

### Tech Debt

- join.tsx: add `await refreshEvents()` after `invitesApi.accept()` before `setJoinState("success")` (GAP-01)
- assetlinks.json SHA-256 fingerprint is a placeholder — replace before Android App Links work in production
- associatedDomains uses YOUR_DOMAIN placeholder — replace before iOS Universal Links work in production

## Session Continuity

Last session: 2026-04-08
Stopped at: v2.4 roadmap created — phases 39–43 defined, all 18 requirements mapped
Resume file: None

Next step: /gsd:plan-phase 39
