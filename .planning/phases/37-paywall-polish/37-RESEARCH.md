# Phase 37: Paywall Polish - Research

**Researched:** 2026-03-31
**Domain:** React Native / Expo — error handling, auth state, modal UI
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Summary

Phase 37 closes three partial integration chains identified in the v2.3 audit. All three are surgical edits to existing files — no new components, no new API routes. The research confirmed the exact lines that need changing in each file.

**Finding 1 (isParticipant):** `useSession()` returns `{ user }` where `user.participantId !== undefined` means the user is a magic-link participant. This discriminant is already used consistently in `polls.tsx` (line 31) and `potluck-setup.tsx` (line 506) as `const isOrganizer = user?.participantId === undefined`. All four `PaywallModal` call sites currently hardcode `isParticipant={false}`. The fix is a one-liner at each site: derive `const isParticipant = user?.participantId !== undefined` from `useSession()` and pass it through.

**Finding 2 (trial_limit_reached):** In `polls.tsx`, the `handleCreatePoll` catch block (line 98) sets a generic `createError` string. In `potluck-setup.tsx`, the `handleNameBlur` catch block (line 200) calls `showToast("Failed to save category...")`. The API returns `{ error: 'trial_limit_reached', limit: 1, resource: 'polls' }` (modules.ts line 205) and `{ error: 'trial_limit_reached', limit: 3, resource: 'potluck_categories' }` (modules.ts line 470) as 403 responses. The fix: inspect `err.response?.data?.error === 'trial_limit_reached'` and call `setShowPaywall(true)` instead of the generic error path.

**Finding 3 (participant_cap_reached):** In `magic-link/[token].tsx`, `handleJoin` (line 148) only checks status 401/400 to set `"invalid"`, and `handleNameSubmit` (line 182) has a bare `catch` that always sets `"error"`. The API returns `{ error: 'participant_cap_reached', limit: 20 }` as a 403 from `magicLink.ts` (line 190). A new `MagicLinkState` value (`"event-full"`) plus a matching render branch would surface a specific "This event is full" message. Alternatively the existing `"error"` state could conditionally show different copy via a state variable, which is lighter.

**Primary recommendation:** Three targeted edits. No new components. Derive `isParticipant` from `useSession()` at each call site; intercept `trial_limit_reached` 403 before the generic catch fallback; add `participant_cap_reached` 403 handling in both `handleJoin` and `handleNameSubmit` in the magic-link screen.

---

## Standard Stack

This phase uses only what is already present — no new libraries.

### Core (existing)
| Component | File | Purpose |
|-----------|------|---------|
| `useSession()` | `app/contexts/AuthContext.tsx` | Returns `{ session, user, isLoading, signIn, signOut, updateUser }` |
| `User.participantId` | `app/api/auth.ts:8` | Optional field; present = magic-link participant, absent = full account |
| `PaywallModal` | `components/PaywallModal.tsx` | Wraps `PaywallBanner` in a full-screen GlueStack modal |
| `PaywallBanner` | `components/PaywallBanner.tsx` | Renders headline + optional CTA button based on `isParticipant` |
| `MagicLinkState` | `app/magic-link/[token].tsx:17` | Union type controlling render branch |

### No New Dependencies
All changes are in application logic. No new packages needed.

---

## Architecture Patterns

### Pattern 1: isParticipant Derivation (already established)
**What:** `user?.participantId !== undefined` is the canonical discriminant used in polls.tsx and potluck-setup.tsx for `isOrganizer`. The inverse (`user?.participantId !== undefined`) should be passed as `isParticipant`.

**Currently at all four call sites:**
```typescript
isParticipant={false}   // hardcoded — never shows participant variant
```

**Correct pattern (already used in the same files for isOrganizer):**
```typescript
const { user } = useSession();
const isParticipant = user?.participantId !== undefined;
// ...
<PaywallModal ... isParticipant={isParticipant} />
```

**Note for edit-event.tsx:** `useSession()` is already imported (line 30) and `user` is already destructured (line 110). The `isParticipant` const just needs to be derived and threaded through to the `PaywallModal` call at line 1038.

**Note for modules-config.tsx:** `useSession()` is NOT currently imported. It must be added. Check exact import path: `import { useSession } from "./contexts/AuthContext"`.

### Pattern 2: Inspecting Axios 403 error body
**What:** Axios rejects with an error where `err.response?.data?.error` holds the server error code string.

**Current broken pattern (polls.tsx:98):**
```typescript
} catch {
  setCreateError("Failed to create poll. Please try again.");
}
```

**Correct pattern:**
```typescript
} catch (err: unknown) {
  const data = (err as { response?: { data?: { error?: string } } })?.response?.data;
  if (data?.error === 'trial_limit_reached') {
    setShowCreateModal(false);
    setShowPaywall(true);
  } else {
    setCreateError("Failed to create poll. Please try again.");
  }
}
```

**Current broken pattern (potluck-setup.tsx CategoryRow.handleNameBlur:200):**
```typescript
} catch {
  showToast("Failed to save category. Please try again.");
}
```

**Correct pattern:**
```typescript
} catch (err: unknown) {
  const data = (err as { response?: { data?: { error?: string } } })?.response?.data;
  if (data?.error === 'trial_limit_reached') {
    // bubble up to parent to open paywall
    onTrialLimitReached?.();
  } else {
    showToast("Failed to save category. Please try again.");
  }
}
```

Note: `CategoryRow` is a sub-component (defined starting around line 100 in potluck-setup.tsx). It receives `eventId`, `cat`, `onUpdate`, `onDelete`, `onReplace` props but no `onTrialLimitReached` prop currently. The parent (`PotluckSetupScreen`) owns `setShowPaywall`. Either: (a) add an `onTrialLimitReached` callback prop to `CategoryRow`, or (b) pass a `setShowPaywall` setter down. Option (a) is cleaner.

### Pattern 3: Magic-link participant_cap_reached handling
**What:** Add a dedicated state branch for the "event full" condition. The cleanest approach is adding a new `MagicLinkState` variant.

**Current type (line 17):**
```typescript
type MagicLinkState =
  | "loading" | "preview" | "name-prompt" | "joining"
  | "success" | "already-joined" | "invalid" | "error";
```

**Proposed addition:**
```typescript
  | "event-full"   // 403 participant_cap_reached on /redeem
```

**Current handleJoin catch (line 148):**
```typescript
} catch (err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 400) {
    setState("invalid");
  } else {
    setState("error");
  }
}
```

**Correct pattern:**
```typescript
} catch (err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const errorCode = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (status === 401 || status === 400) {
    setState("invalid");
  } else if (status === 403 && errorCode === 'participant_cap_reached') {
    setState("event-full");
  } else {
    setState("error");
  }
}
```

**handleNameSubmit catch (line 182) currently bare:**
```typescript
} catch {
  setState("error");
}
```
Same fix — add the 403/participant_cap_reached branch.

**Render branch for "event-full" state:** Use same `AlertTriangle` icon as `"invalid"`, amber color (`#f59e0b`). Message: "This event is full" / "The organiser has reached the maximum number of participants. Ask them to upgrade their plan." Button: "Sign In" or just go back (no retry makes sense here since the cap is a hard limit until the organiser upgrades).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Error code inspection | Custom axios wrapper | Inline type cast: `(err as { response?: { data?: { error?: string } } })?.response?.data?.error` — consistent with existing pattern in magic-link screen line 149 |
| Participant detection | New hook or context field | `user?.participantId !== undefined` — pattern already used in polls.tsx:31 and potluck-setup.tsx:506 |

---

## Common Pitfalls

### Pitfall 1: modules-config.tsx has no useSession import
**What goes wrong:** Copy-pasting the isParticipant pattern without adding the import causes a compile error.
**How to avoid:** Add `import { useSession } from "./contexts/AuthContext";` to modules-config.tsx. The file currently does NOT import this hook (confirmed by grep — no `useSession` in modules-config.tsx).

### Pitfall 2: CategoryRow sub-component cannot directly call setShowPaywall
**What goes wrong:** `CategoryRow` is a separate component inside potluck-setup.tsx. It does not have access to the parent's `setShowPaywall` state setter.
**How to avoid:** Add an `onTrialLimitReached?: () => void` prop to `CategoryRow`'s props type, pass `() => setShowPaywall(true)` from the parent, and call it in the catch block when `trial_limit_reached` is detected.

### Pitfall 3: handleNameSubmit has a bare catch — loses error reference
**What goes wrong:** The bare `catch` in `handleNameSubmit` (line 182) discards the error object entirely, so adding error-code inspection requires changing `catch` to `catch (err: unknown)`.
**How to avoid:** Change to `catch (err: unknown)` and inspect `err.response?.data?.error` before falling back to `setState("error")`.

### Pitfall 4: edit-event.tsx PaywallModal is organizer-only in practice
**What goes wrong:** The paywall in `edit-event.tsx` fires only from the "Add Participant" button which is not visible to participants (confirmed: the button is gated by `isFree && participants.length >= PARTICIPANT_CAP`, and participants cannot access edit-event at all). Passing `isParticipant` correctly here is safe (no behavioral regression) but also practically a no-op for v2.3.
**How to avoid:** Still fix it for correctness; it's a one-liner and keeps all four call sites consistent.

---

## Code Examples

### Confirmed API error shapes (from apps/api/src/routes/modules.ts and magicLink.ts)

```
POST /api/events/:id/modules/:moduleId/polls
→ 403 { error: 'trial_limit_reached', limit: 1, resource: 'polls' }

POST /api/events/:id/modules/:moduleId/potluck/categories
→ 403 { error: 'trial_limit_reached', limit: 3, resource: 'potluck_categories' }

POST /api/auth/magic-link/redeem
→ 403 { error: 'participant_cap_reached', limit: 20 }
```

### Confirmed PaywallBanner behavior (components/PaywallBanner.tsx:33–38)

```typescript
function getHeadline(feature: PaywallFeature, isParticipant: boolean): string {
  if (isParticipant) {
    return "Ask your organiser to upgrade this event";
    // No CTA button rendered (isParticipant guard at line 94)
  }
  // ... organizer-specific copy
}
```

So `isParticipant={true}` is all that's needed to unlock the participant variant. The component already handles it correctly — the bug is purely at the call sites.

---

## File-by-File Change Summary

| File | Lines Affected | Change |
|------|----------------|--------|
| `app/polls.tsx` | 31, 98–102, 472 | Derive `isParticipant`; catch `trial_limit_reached`; pass `isParticipant` to modal |
| `app/potluck-setup.tsx` | ~100 (CategoryRow props), 200, 506, 831 | Add `onTrialLimitReached` prop; catch `trial_limit_reached`; derive `isParticipant`; pass to modal |
| `app/edit-event.tsx` | 110 area, 1038 | Derive `isParticipant` from already-available `user`; pass to modal |
| `app/modules-config.tsx` | imports, ~125, 379 | Add `useSession` import; derive `isParticipant`; pass to modal |
| `app/magic-link/[token].tsx` | 17–24 (type), 148–156, 182–186, renderContent | Add `"event-full"` state; handle 403 in both catch blocks; add render branch |

---

## Open Questions

1. **modules-config.tsx participant access:** The `modules-config` screen is described as organizer-only. Confirm there's no route that allows a participant to reach it, so `isParticipant={true}` at that call site would always be false in practice. (Low risk — fix anyway for correctness.)

2. **"event-full" UX copy:** The spec says "This event is full" — confirm whether a back button or "Sign In" button is the right CTA. Given the user cannot join, there's nothing to retry. A "Go Back" button (router.back()) or "Sign In" are both reasonable — planner should decide.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `apps/gatherly-mobile/components/PaywallModal.tsx` — full component, props interface
- `apps/gatherly-mobile/components/PaywallBanner.tsx` — `isParticipant` branching logic
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — `useSession()` return shape, `User` interface
- `apps/gatherly-mobile/app/api/auth.ts` — `User.participantId` optional field
- `apps/gatherly-mobile/app/polls.tsx` — catch blocks at lines 62, 98, 109, 143; PaywallModal at 467–473; `isOrganizer` at line 31
- `apps/gatherly-mobile/app/potluck-setup.tsx` — CategoryRow catch blocks at 179, 200; PotluckSetupScreen at lines 506, 546, 826–831
- `apps/gatherly-mobile/app/edit-event.tsx` — `user` at line 110; PaywallModal at 1033–1039
- `apps/gatherly-mobile/app/modules-config.tsx` — `paywallFeature` state; PaywallModal at 374–380; no `useSession` import confirmed
- `apps/gatherly-mobile/app/magic-link/[token].tsx` — `MagicLinkState` type; `handleJoin` catch at 148; `handleNameSubmit` catch at 182; render switch
- `apps/api/src/routes/modules.ts` — error shapes at lines 205, 470
- `apps/api/src/routes/magicLink.ts` — `participant_cap_reached` at line 190

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from direct file reads
- Architecture: HIGH — patterns confirmed from existing code in same files
- Pitfalls: HIGH — derived from actual import analysis and component structure
- API error shapes: HIGH — read directly from backend route files

**Research date:** 2026-03-31
**Valid until:** Stable (no external dependencies; pure internal codebase changes)
