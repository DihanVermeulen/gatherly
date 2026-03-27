---
plan: 34-01
phase: 34-infrastructure
status: complete
subsystem: api/mobile-types
tags: [plan-tier, premium, type-fix, upgrade-route]
completed: 2026-03-27
duration: ~5m

requires: []
provides:
  - TEvent.planTier typed as 'free' | 'premium'
  - PREMIUM_MODULES reduced to ["white_elephant"]
  - PATCH /api/events/:id/upgrade route
affects:
  - 34-02: trial limits gate checks planTier value
  - 35: paywall components depend on planTier type and upgrade route

tech-stack:
  added: []
  patterns:
    - idempotent UPDATE via WHERE clause match (upgrade route)

key-files:
  modified:
    - apps/gatherly-mobile/app/api/events.ts
    - apps/api/src/routes/modules.ts
    - apps/api/src/routes/events.ts

decisions:
  - planTier is 'free' | 'premium' — 'standard' removed from codebase
  - PREMIUM_MODULES = ["white_elephant"] — polls/potluck/rsvp gated at usage level (Plan 02), not module-enable level
  - Upgrade route is idempotent — second call returns 200 because WHERE clause (id + organizer_id) still matches
---

# Phase 34 Plan 01: Tier Type Fix and Upgrade Route Summary

**One-liner:** planTier type corrected to 'free' | 'premium', PREMIUM_MODULES reduced to white_elephant only, and idempotent PATCH upgrade route added to events API.

## What Was Built

Three targeted changes establishing the contractual foundation for Phase 35 paywall screens:

1. **planTier type fix (mobile):** `TEvent.planTier` changed from `'free' | 'standard'` to `'free' | 'premium'`. The string 'standard' no longer appears anywhere in the mobile events API file.

2. **PREMIUM_MODULES reduction (API):** `PREMIUM_MODULES` in `modules.ts` reduced from `["polls", "potluck", "rsvp", "white_elephant"]` to `["white_elephant"]`. Free-tier events can now enable polls and potluck modules without a 403; usage is capped by trial limits in Plan 02, not the module-enable gate.

3. **Upgrade route (API):** New `PATCH /api/events/:id/upgrade` route in `events.ts` that sets `plan_tier = 'premium'` and returns the full updated event via `fetchEventById()`. The route is idempotent — a second call on an already-premium event still matches the WHERE clause and returns 200.

## Tasks Completed

| Task | Commit | Files Modified |
|------|--------|----------------|
| Task 1: Fix planTier type union in TEvent (mobile) | 7408bd1 | apps/gatherly-mobile/app/api/events.ts |
| Task 2: Reduce PREMIUM_MODULES to white_elephant only and add upgrade route | 287eb97 | apps/api/src/routes/modules.ts, apps/api/src/routes/events.ts |

## Decisions Made

- **PREMIUM_MODULES = ["white_elephant"] only** — polls and potluck removed from hard gate; their usage is controlled at the creation endpoint level (Plan 02 trial limits), not at the module-enable step. rsvp removed as earmarked in v2.3 design.
- **Idempotency via WHERE clause** — the upgrade handler does not check current plan_tier before updating; it issues `UPDATE ... WHERE id = $1 AND organizer_id = $2`. Since both conditions hold on a repeat call, rowCount is always 1 for a valid organizer, so no 403 or 500 fires on repeat calls.
- **fetchEventById used directly** — no import needed; the function is file-scoped in events.ts.

## Deviations

None — plan executed exactly as written.

## Verification

- `grep -rn "standard" apps/gatherly-mobile/app/api/events.ts` — zero matches
- `grep -n "PREMIUM_MODULES" apps/api/src/routes/modules.ts` — shows `["white_elephant"]` only
- `grep -n "upgrade" apps/api/src/routes/events.ts` — shows PATCH route at lines 431/433
- `cd apps/api && npx tsc --noEmit` — exits 0, no errors

## Next Phase Readiness

Plan 34-02 (trial limits) can proceed immediately. The planTier type and PREMIUM_MODULES contract are now stable. The upgrade route is available for Plan 35 paywall wiring.
