---
plan: 34-02
status: complete
---

# Summary: Participant Caps and Trial Limits

## What Was Built

Six guard blocks across three route files enforce free-tier limits:

- `events.ts` POST /participants: count check + INSERT wrapped in a transaction (BEGIN/COMMIT/ROLLBACK) so no race window exists; returns 403 `participant_cap_reached` when free event already has 20 participants
- `events.ts` PUT / people sync: plan_tier check inserted after `currentNames` is computed, before the people insertion loop; returns 403 `participant_cap_reached` (with ROLLBACK) if net new additions would push total past 20
- `magicLink.ts` /redeem else branch: cap check runs after BEGIN and before INSERT into participants; returns 403 `participant_cap_reached` for free events at 20 — only fires for first-time redemptions, not returning participants
- `modules.ts` POST /polls: trial limit check after module existence guard, before getClient(); returns 403 `trial_limit_reached` (limit: 1, resource: polls) when free event already has 1 poll
- `modules.ts` POST /potluck/categories: trial limit check after qty validation, before sortResult query; returns 403 `trial_limit_reached` (limit: 3, resource: potluck_categories) when free event already has 3 categories

## Tasks Completed

| Task | Commit | Files Modified |
|------|--------|----------------|
| Task 1: Participant cap on POST /participants and PUT people sync | 24f4432 | apps/api/src/routes/events.ts |
| Task 2: Magic-link cap + trial limits for polls and potluck | feeb253 | apps/api/src/routes/magicLink.ts, apps/api/src/routes/modules.ts |

## Deviations

None — plan executed exactly as written.

## Verification

- `grep -n "participant_cap_reached" apps/api/src/routes/events.ts` — 2 matches (lines 328, 492)
- `grep -n "participant_cap_reached" apps/api/src/routes/magicLink.ts` — 1 match (line 190, inside else/first-time branch only)
- `grep -n "trial_limit_reached" apps/api/src/routes/modules.ts` — 2 matches (lines 205, 470)
- `grep -n "BEGIN" apps/api/src/routes/events.ts` — line 483 confirms BEGIN inside POST /participants handler
- `cd apps/api && npx tsc --noEmit` — exits 0, no errors
