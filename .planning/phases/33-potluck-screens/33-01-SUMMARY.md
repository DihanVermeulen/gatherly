---
plan: 33-01
phase: 33-potluck-screens
status: complete
completed: 2026-03-24
commits:
  - 1492f63
  - bba8dff
---

# Plan 33-01: Potluck API Client + Setup Screen

## What Was Built

### Task 1: Potluck API types and methods (commit 1492f63)
Added to `apps/gatherly-mobile/app/api/modules.ts`:
- `TPotluckCategory` and `TPotluckSignup` types exported
- 7 new modulesApi methods: `getPotluckCategories`, `createPotluckCategory`, `updatePotluckCategory`, `deletePotluckCategory`, `getPotluckSignups`, `createPotluckSignup`, `deletePotluckSignup`

### Task 2: potluck-setup.tsx screen + navigation wiring (commit bba8dff)
- Created `apps/gatherly-mobile/app/potluck-setup.tsx` (642 lines)
  - AppHeader with "Setup Potluck" title and "Preview" right action
  - Free-tier gate: shows upgrade prompt if `event.planTier === 'free'`
  - Category cards with name input, quantity stepper, food image picker, suggestion chips, delete button
  - Auto-save on blur for name and quantity changes
  - "+ Add New Category" button
  - "Save and Publish" / "Update & Save" button (merges potluck into active modules without wiping others)
  - Empty state when no categories exist
- Modified `apps/gatherly-mobile/app/event-details.tsx`:
  - `case "potluck":` now routes organizers to `/potluck-setup?id=${id}` and participants to `/potluck?id=${id}`

## Deviations
- Also created `apps/gatherly-mobile/app/utils/imageUri.ts` as a shared utility for image URI handling (reusable pattern)
- Previous rate limit interrupted execution mid-plan; orchestrator committed Task 2 to complete the plan

## Must-Haves Verified
- ✓ Organizer can navigate to potluck setup from event details
- ✓ Organizer can add categories with name, quantity stepper, food image, and suggestion chips
- ✓ Organizer can delete categories
- ✓ Organizer can publish potluck (draft -> active)
- ✓ Free-tier events show upgrade prompt instead of setup
- ✓ TPotluckCategory and TPotluckSignup exported from modules.ts
- ✓ potluck-setup.tsx exists with 642 lines (>150 minimum)
- ✓ event-details.tsx routes to potluck-setup via router.push
- ✓ modulesApi.createPotluckCategory / updatePotluckCategory / deletePotluckCategory used in setup screen
