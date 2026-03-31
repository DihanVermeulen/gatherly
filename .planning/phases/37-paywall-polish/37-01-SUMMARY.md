---
phase: 37-paywall-polish
plan: "01"
subsystem: mobile-paywall
tags: [paywall, isParticipant, magic-link, trial_limit_reached, participant_cap_reached, error-handling]

dependency-graph:
  requires:
    - 36-02 (PaywallModal component, PaywallBanner, PaywallFeature type)
    - 35-01 (PaywallBanner isParticipant prop)
    - 34-01 (participantId-as-discriminant pattern in AuthContext)
  provides:
    - isParticipant correctly derived at all four PaywallModal call sites
    - trial_limit_reached 403 intercepted in polls and potluck-setup
    - participant_cap_reached 403 handled with dedicated "event-full" screen
  affects:
    - 37-02+ (further paywall polish tasks can rely on correct isParticipant threading)

tech-stack:
  added: []
  patterns:
    - "participantId-as-discriminant: user?.participantId !== undefined = magic-link participant"
    - "Error code discrimination: (err as { response?: { data?: { error?: string } } })?.response?.data?.error"
    - "onTrialLimitReached callback prop: bubble 403 errors from child component to parent PaywallModal"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/polls.tsx
    - apps/gatherly-mobile/app/potluck-setup.tsx
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/modules-config.tsx
    - apps/gatherly-mobile/app/magic-link/[token].tsx

decisions:
  - "Use !isOrganizer for isParticipant in files that already have isOrganizer (polls.tsx, potluck-setup.tsx) for consistency"
  - "Use user?.participantId !== undefined directly in files without isOrganizer (edit-event.tsx, modules-config.tsx)"
  - "onTrialLimitReached as optional callback prop rather than ref or context — keeps CategoryCard self-contained"
  - "event-full render branch uses same amber AlertTriangle as invalid state — visual consistency without new component"
  - "Go Back button on event-full uses router.back() — no retry since cap is a hard limit"

metrics:
  duration: "~4m"
  completed: "2026-03-31"
---

# Phase 37 Plan 01: Paywall Polish — isParticipant + 403 Error Handling Summary

**One-liner:** Thread isParticipant from useSession() to all four PaywallModal call sites and intercept trial_limit_reached/participant_cap_reached 403s with correct UI branches.

## What Was Built

### Task 1: isParticipant at all four PaywallModal call sites + trial_limit_reached interception

Four files modified to replace hardcoded `isParticipant={false}` with `isParticipant={isParticipant}` derived from `useSession()`:

**polls.tsx:**
- Added `const isParticipant = !isOrganizer;` after existing isOrganizer line
- Updated `handleCreatePoll` catch from bare `catch` to `catch (err: unknown)` — inspects `response.data.error`; if `trial_limit_reached`, closes create modal and opens PaywallModal; else shows generic error
- Passes `isParticipant={isParticipant}` to PaywallModal

**potluck-setup.tsx:**
- Added `onTrialLimitReached?: () => void` prop to `CategoryCardProps` and destructuring
- Updated `handleNameBlur` catch in `CategoryCard` from bare `catch` to `catch (err: unknown)` — calls `onTrialLimitReached?.()` on `trial_limit_reached`, else shows toast
- Added `const isParticipant = !isOrganizer;` in `PotluckSetupScreen`
- Passes `onTrialLimitReached={() => setShowPaywall(true)}` and `isParticipant={isParticipant}` to CategoryCard/PaywallModal

**edit-event.tsx:**
- Added `const isParticipant = user?.participantId !== undefined;` after existing `{ user }` destructure
- Passes `isParticipant={isParticipant}` to PaywallModal

**modules-config.tsx:**
- Added `import { useSession } from "./contexts/AuthContext";`
- Added `const { user } = useSession();` and `const isParticipant = user?.participantId !== undefined;` in component
- Passes `isParticipant={isParticipant}` to PaywallModal

### Task 2: participant_cap_reached 403 on magic-link redemption screen

**magic-link/[token].tsx:**
- Extended `MagicLinkState` type union with `"event-full"`
- Updated `handleJoin` catch: extracts `errorCode` from `response.data.error`; adds `else if (status === 403 && errorCode === 'participant_cap_reached')` branch calling `setState("event-full")`
- Updated `handleNameSubmit` catch from bare `catch` to `catch (err: unknown)` with same 403/participant_cap_reached check
- Added `case "event-full"` render branch: amber AlertTriangle icon (size 64, color `#f59e0b`), "This event is full" heading, explanation body, "Go Back" button calling `router.back()`

## Verification

- `grep -rn "isParticipant={false}" apps/gatherly-mobile/app/` → 0 matches
- `grep -rn "isParticipant={isParticipant}" apps/gatherly-mobile/app/` → 4 matches (one per file)
- `grep -n "trial_limit_reached" polls.tsx potluck-setup.tsx` → matches in both
- `grep -n "participant_cap_reached" magic-link/[token].tsx` → 3 matches (comment + 2 catch blocks)
- `grep -n "event-full" magic-link/[token].tsx` → 4 matches (type, 2x setState, render case)
- TypeScript: no new errors introduced (pre-existing GlueStack UI component errors in bottomsheet/table unchanged)

## Commits

| Hash | Message |
|------|---------|
| dc0de35 | feat(37-01): derive isParticipant at all PaywallModal call sites + intercept trial_limit_reached |
| 5be52e3 | feat(37-01): handle participant_cap_reached 403 on magic-link redemption screen |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 37-02 can proceed. The isParticipant threading is complete across all paywall surfaces; the error-code discrimination pattern is established and reusable for any further 403 handling.
