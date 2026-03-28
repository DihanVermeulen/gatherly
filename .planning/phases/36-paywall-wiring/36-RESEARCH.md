# Phase 36: Paywall Wiring - Research

**Researched:** 2026-03-28
**Domain:** React Native / Expo — tier enforcement wiring + full-screen PaywallBanner modal
**Confidence:** HIGH — all findings from direct codebase inspection

## Summary

Phase 36 is a pure wiring phase. Every screen that needs to change exists and is fully implemented. The PaywallBanner component built in Phase 35 exists at `components/PaywallBanner.tsx` but is not yet used by any screen — confirmed by grep. No new libraries are required.

The key architectural discovery is that Phase 35 built PaywallBanner as an **inline card** (not a modal), but Phase 36 must show it as a **full-screen modal**. The CONTEXT.md decision locks this: "PaywallBanner is shown as a full-screen modal — Phase 36 is responsible for implementing this modal pattern." This means Phase 36 needs to build a `PaywallModal` wrapper (or promote the existing banner into a modal shell) rather than importing `PaywallBanner` as-is into screen layouts.

The five screens to modify are `modules-config.tsx`, `potluck-setup.tsx`, `event-details.tsx`, `edit-event.tsx`, and `polls.tsx`. Each has existing bespoke upgrade UX that must be replaced. The bespoke implementations are: a `<Modal>` from GlueStack in `modules-config.tsx`; a full-screen free-tier gate view in `potluck-setup.tsx`; no current upgrade UX in `event-details.tsx`, `edit-event.tsx`, or `polls.tsx` (those are net-new).

**Primary recommendation:** Build a `PaywallModal` wrapper component that renders `PaywallBanner` inside a GlueStack `<Modal size="full">` with dismiss-on-backdrop. Wire each screen to `showPaywallModal` state. The existing `PaywallBanner` content renders inside the modal body.

## Standard Stack

No new installations needed. All libraries are already present.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GlueStack UI Modal | @gluestack-ui/core ^3.0.12 | Full-screen modal shell | Project standard; used in modules-config, polls; supports `size="full"` variant |
| `lucide-react-native` | ^0.510.0 | `Lock` icon for card tint overlay | Already imported in `modules-config.tsx` and `event-details.tsx` |
| `expo-web-browser` | ~15.0.7 | Opens external upgrade URL in CTA | Already used in `PaywallBanner.tsx` and `pricing.tsx` |
| `components/PaywallBanner.tsx` | internal | The paywall content (headline + CTA) | Built in Phase 35; `PaywallFeature` type already defined |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useSession` (AuthContext) | internal | `user.participantId !== undefined` = participant | Passed as `isParticipant` to PaywallBanner |
| `useEvents` (EventsContext) | internal | Access `event.planTier` to derive `isFree` | All screens derive `isFree` from `event?.planTier ?? 'free'` |
| React Native `View` opacity | Built-in | Grey tint overlay on locked module cards | 0.4 opacity on card + Lock icon top-right |

### No New Installations
```bash
# Nothing to install — all dependencies present
```

## Architecture Patterns

### File Locations
```
apps/gatherly-mobile/
├── components/
│   ├── PaywallBanner.tsx          # Exists (Phase 35) — inline card, content only
│   └── PaywallModal.tsx           # NEW in Phase 36 — wraps banner in full-screen Modal
├── app/
│   ├── modules-config.tsx         # Modify: replace bespoke Modal, wire PaywallModal
│   ├── potluck-setup.tsx          # Modify: replace full-screen gate, add counter, wire PaywallModal
│   ├── event-details.tsx          # Modify: hide premium modules on free events (no lock treatment)
│   ├── edit-event.tsx             # Modify: participant badge + cap enforcement + PaywallModal
│   └── polls.tsx                  # Modify: polls counter + cap enforcement + PaywallModal
```

### Pattern 1: PaywallModal Wrapper Component

**What:** A thin wrapper that puts `PaywallBanner` inside a GlueStack `<Modal size="full">`. All screens use this one component.

**Why needed:** Phase 35 `PaywallBanner` is an inline card (positioned in a scroll view). Phase 36 requires full-screen modal. Rather than change the banner itself, wrap it.

**Key decisions from CONTEXT.md:**
- Dismiss: `onClose` keeps user on current screen (no router.back())
- CTA tap: opens external URL via expo-web-browser; modal stays open behind browser
- The current `PaywallBanner.handleUpgradeCta` uses `Alert.alert` before opening the browser — this Alert pattern should be preserved or removed in favour of direct open. CONTEXT.md says "opens external URL via expo-web-browser while the modal stays open behind it (no close-then-open sequence)" — this means the Alert confirmation dialog should be dropped; call `WebBrowser.openBrowserAsync` directly from the CTA press.

**Component signature:**
```typescript
// Source: codebase inspection of PaywallBanner.tsx + CONTEXT.md decisions
type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  feature: PaywallFeature;
  isParticipant: boolean;
  eventId?: string;
};
```

**Example structure:**
```typescript
// components/PaywallModal.tsx
import { Modal, ModalBackdrop, ModalContent, ModalBody, ModalCloseButton }
  from "@/components/ui/modal";
import { PaywallBanner } from "./PaywallBanner";

export function PaywallModal({ isOpen, onClose, feature, isParticipant, eventId }: PaywallModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent>
        <ModalCloseButton onPress={onClose}>...</ModalCloseButton>
        <ModalBody>
          <PaywallBanner feature={feature} isParticipant={isParticipant} eventId={eventId} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
```

**Note on GlueStack Modal `size="full"`:** The modal style definition in `components/ui/modal/index.tsx` has a `full: 'w-full'` variant for content width. For a truly full-screen modal, also set `h-full` on `ModalContent` or wrap content in a flex-1 View. Inspect the existing modal styling before implementing.

### Pattern 2: `isFree` Derivation (Consistent Across All Screens)

All five screens derive the free-tier flag the same way:
```typescript
const event = events.find((e) => e.id === id) ?? null;
const isFree = (event?.planTier ?? 'free') === 'free';
```
`modules-config.tsx` and `potluck-setup.tsx` already do this. `event-details.tsx`, `edit-event.tsx`, and `polls.tsx` do not — they must add it.

### Pattern 3: Lock Card Visual (Module Config only)

**Decision from CONTEXT.md:** In Module Config, locked modules show a grey tint (entire card) + lock icon top-right corner. Toggle is hidden (not just greyed out). No separate badge for "Coming Soon" vs "Premium" — same tint, different badge text.

**Current state:** `modules-config.tsx` shows a greyed-out toggle with `opacity: 0.4` and an inline `<Lock>` icon in the label row. This does NOT match the spec.

**Required changes:**
1. Remove the `<Switch>` entirely for locked/coming-soon modules (CONTEXT.md: "no toggle shown for locked modules")
2. Apply grey tint to entire card row: `backgroundColor: 'rgba(0,0,0,0.04)'` or similar (opacity value is Claude's discretion)
3. Move `Lock` icon to top-right corner of the card (absolute positioned or in a right-aligned row)
4. Keep "Coming Soon" badge text for `comingSoon` modules; keep lock icon for `premium && !comingSoon`

### Pattern 4: Event Hub — Hide Premium Modules on Free Events

**Decision from CONTEXT.md:** Premium module cards are hidden entirely from Event Details hub on free events, for all users. No lock treatment in the hub.

**Current state:** `event-details.tsx` renders ALL modules from `MODULE_CATALOG` and dims them if inactive or coming-soon using `opacity: 0.6`. It does not check `planTier` at all.

**Required change:** Before rendering a module card row, filter out premium modules when `isFree`. The premium module types in the API are: `polls`, `rsvp`, `potluck`, `white_elephant`, `photo_gallery`, `expense_splitter`. The non-premium type is: `gift_exchange`.

**Identifying premium modules in the hub:** `MODULE_CATALOG` in `event-details.tsx` does not have a `premium` field (unlike `MODULE_DEFS` in `modules-config.tsx`). The planner must either add a `premium` field to `MODULE_CATALOG` or define a `PREMIUM_MODULE_TYPES` constant set.

### Pattern 5: Polls Screen Counter and Cap

**Current state in `polls.tsx`:** No tier awareness. The `+` button always shows and `handleCreatePoll` calls the API. If the API returns `trial_limit_reached`, the error is caught generically as "Failed to create poll."

**API error shape (confirmed in `modules.ts`):**
```json
{ "error": "trial_limit_reached", "limit": 1, "resource": "polls" }
```

**Required changes:**
1. Add `isFree` derivation — polls.tsx does not currently import `useEvents`. Need to add it.
2. Counter: "X of 1 polls used · Upgrade for unlimited" — always visible on free tier. Poll count = `polls.length`. Display above the polls list or below the header.
3. The `+` button in the header: when `isFree && polls.length >= 1`, tapping it opens `PaywallModal` instead of `setShowCreateModal(true)`.
4. Handle `trial_limit_reached` from the API as a fallback (defensive).

**Important nuance from CONTEXT.md:** Counter is "always visible on free-tier events, regardless of current poll count" — show it even at 0/1.

### Pattern 6: Edit Event Participant Badge and Cap

**Current state in `edit-event.tsx`:** No participant cap badge. The `UserPlus` invite button shows when `!isLocked` (assignments not generated). No paywall wiring for participants.

**Required changes:**
1. `isFree` derivation — `edit-event.tsx` does not derive this. Add it.
2. `PARTICIPANT_CAP = 20` constant.
3. Badge `{participants.length}/20 participants`: visible only when `participants.length >= 15`. Render near the guest list section header.
4. Invite button behaviour: when `isFree && participants.length >= 20`, pressing `UserPlus` opens `PaywallModal` with `feature="participant_cap"` instead of calling `handleCreateInvite`.

**Decision from CONTEXT.md:** "visible only when 15 or more participants exist (≥75% of cap); hidden below that threshold."

### Pattern 7: Potluck Setup — Replace Gate + Add Counter

**Current state in `potluck-setup.tsx`:** When `isFree`, the entire screen renders a locked gate UI with a disabled "Upgrade Plan" button. This is the bespoke full-screen gate that must be replaced.

**Required changes:**
1. Remove the `if (!loading && isFree) { return <locked gate>; }` block entirely.
2. Free-tier users can now enter the setup screen.
3. Add "X of 3 categories · Upgrade for unlimited" counter: visible when `categories.length >= 2`.
4. When a free-tier user tries to add a 4th category (i.e., `categories.length >= 3 && isFree`), the "Add New Category" button press opens `PaywallModal` with `feature="potluck_trial"` instead of calling `handleAddCategory`.
5. The API already enforces the 3-category limit with `trial_limit_reached` — if the client-side check is bypassed, the API returns `{ error: 'trial_limit_reached', limit: 3, resource: 'potluck_categories' }`. Handle this in `CategoryCard.handleNameBlur` to surface PaywallModal.

**Decision from CONTEXT.md:** Counter visible when `categories.length >= 2` (not at 1 or 0).

### Pattern 8: PaywallBanner CTA — Remove Alert Confirmation

**Current state:** `PaywallBanner.handleUpgradeCta` calls `Alert.alert(...)` to confirm before opening the browser.

**Required change:** CONTEXT.md decision says "Tapping 'Request Access' CTA: opens external URL via expo-web-browser while the modal stays open behind it (no close-then-open sequence)." This implies direct `WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL)` call, no Alert intermediary. The `PaywallBanner` component (or the `PaywallModal` wrapper's CTA) should call `openBrowserAsync` directly.

This change is in `PaywallBanner.tsx` or the modal's CTA button, not in each calling screen.

### Anti-Patterns to Avoid

- **Re-creating the Alert confirmation dialog:** CONTEXT.md explicitly requires the modal to stay open behind the browser. The current `Alert.alert` pattern in `PaywallBanner` must be dropped.
- **Passing `router` to the dismiss handler:** After dismissal, user stays on the current screen. Do NOT call `router.back()` in `onClose`.
- **Greying out the toggle instead of hiding it:** CONTEXT.md specifies "no toggle shown for locked modules — lock icon only (toggle hidden, not greyed out)."
- **Showing lock treatment in Event Details hub:** Decision overrides the roadmap spec — premium cards are hidden entirely, not locked.
- **Using `opacity` on the whole card for Event Details:** Hiding is the correct treatment; opacity/lock is only for Module Config.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-screen modal | Custom absolute-positioned overlay | GlueStack `<Modal size="full">` | Already used in project; handles backdrop, animation, accessibility |
| Paywall content | Inline amber card per screen | `PaywallBanner` from Phase 35 | Already built with correct copy logic and feature-to-headline mapping |
| External URL opening | `Linking.openURL` | `expo-web-browser` `openBrowserAsync` | Already used in PaywallBanner; keeps app open behind browser |

**Key insight:** Every visual and logic primitive is already in the codebase. This phase is plumbing, not construction.

## Common Pitfalls

### Pitfall 1: PREMIUM_MODULES Mismatch Between API and Client

**What goes wrong:** The API in `modules.ts` defines `const PREMIUM_MODULES = ["white_elephant"]` — only white_elephant is gated at the module-enable level. But `polls`, `rsvp`, `potluck` have separate trial limits (1 poll, 3 categories). On the client, `MODULE_DEFS` in `modules-config.tsx` marks `polls`, `rsvp`, `potluck`, `white_elephant` all as `premium: true`. These two definitions are not synchronized.

**Why it happens:** The API's PREMIUM_MODULES constant only controls which modules can't be enabled at all on free (white_elephant is fully blocked). The trial limits are separate enforcement.

**How to avoid:** When building hub filtering, define premium module types client-side consistently. The decision is: hide `polls`, `rsvp`, `potluck`, `white_elephant`, `photo_gallery`, `expense_splitter` from Event Details hub on free events. Use the `MODULE_DEFS` premium field from `modules-config.tsx` as source of truth on the client.

### Pitfall 2: `polls.tsx` Missing `useEvents` Import

**What goes wrong:** `polls.tsx` currently only imports `useSession` for auth context. It does not import `useEvents`, so `event.planTier` is not accessible. Adding tier enforcement without adding this import causes a runtime error.

**How to avoid:** Add `useEvents` import and derive `event` from `state.events.find((e) => e.id === id)` in `polls.tsx`.

### Pitfall 3: `event-details.tsx` Has No `planTier` Awareness

**What goes wrong:** `event-details.tsx` does not currently read `planTier` from the event object at all. It renders all `MODULE_CATALOG` entries regardless of tier.

**How to avoid:** Add `const isFree = (event?.planTier ?? 'free') === 'free'` and filter `MODULE_CATALOG` entries before rendering. Also add a `premium` field to `MODULE_CATALOG` (mirroring `MODULE_DEFS` in modules-config).

### Pitfall 4: GlueStack Modal `size="full"` May Need Height Override

**What goes wrong:** The `modalContentStyle` in `components/ui/modal/index.tsx` sets `size.full: 'w-full'` (width only). Without explicit height, the modal content may not fill the vertical space as expected.

**How to avoid:** When building `PaywallModal`, set explicit styles on `ModalContent`: `style={{ flex: 1 }}` or use the `h-full` className. Inspect the rendered output and adjust.

### Pitfall 5: Alert Confirmation in PaywallBanner Conflicts with Modal-Stay-Open Requirement

**What goes wrong:** The current `PaywallBanner.handleUpgradeCta` shows an `Alert.alert` before opening the browser. On iOS, the Alert dismisses the modal backdrop temporarily, creating a flash. More critically, it violates the CONTEXT.md decision.

**How to avoid:** Replace `Alert.alert(...)` with a direct `WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL)` call. The modal stays open; the browser opens on top.

### Pitfall 6: Polls Counter Visibility Rule

**What goes wrong:** Implementing "always visible when free" as "show when polls.length >= 1" — this would hide the counter at 0 polls.

**CONTEXT.md decision:** "always visible on free-tier events, regardless of current poll count." Show the counter when `isFree`, even if `polls.length === 0` (0 of 1 polls used).

## Code Examples

### isFree Derivation (for screens that don't have it yet)
```typescript
// Source: codebase inspection — pattern from modules-config.tsx and potluck-setup.tsx
const {
  state: { events },
} = useEvents();
const event = events.find((e) => e.id === id) ?? null;
const isFree = (event?.planTier ?? 'free') === 'free';
```

### Polls Counter (always visible on free tier)
```typescript
// Source: CONTEXT.md decisions + polls.tsx inspection
{isFree && (
  <View style={{ /* counter row styles */ }}>
    <Text style={{ fontSize: 12, color: '#64748b' }}>
      {polls.length} of 1 polls used · Upgrade for unlimited
    </Text>
    <Pressable onPress={() => setShowPaywallModal(true)}>
      <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>Upgrade</Text>
    </Pressable>
  </View>
)}
```

### Participant Badge in Edit Event
```typescript
// Source: CONTEXT.md decisions — visible when participants.length >= 15
const PARTICIPANT_CAP = 20;
const showParticipantBadge = isFree && participants.length >= 15;

{showParticipantBadge && (
  <Text style={{ fontSize: 12, color: '#64748b' }}>
    {participants.length}/{PARTICIPANT_CAP} participants
  </Text>
)}
```

### Handling Invite Button Cap in Edit Event
```typescript
// Source: CONTEXT.md decisions — cap enforcement
const atParticipantCap = isFree && participants.length >= PARTICIPANT_CAP;

<Pressable
  onPress={atParticipantCap
    ? () => setShowPaywallModal(true)
    : handleCreateInvite
  }
  disabled={inviteLoading && !atParticipantCap}
>
  <UserPlus size={16} color="#0d9488" />
</Pressable>
```

### Filtering Premium Modules from Event Details Hub
```typescript
// Source: CONTEXT.md decisions — hide premium on free events
const PREMIUM_MODULE_TYPES = new Set([
  'polls', 'rsvp', 'potluck', 'white_elephant',
  'photo_gallery', 'expense_splitter',
]);

// In the render section, before MODULE_CATALOG.filter:
const visibleEntries = isFree
  ? entries.filter((e) => !PREMIUM_MODULE_TYPES.has(e.type))
  : entries;
```

### PaywallModal state in any screen
```typescript
// Source: modules-config.tsx pattern adapted for modal
const [showPaywallModal, setShowPaywallModal] = useState(false);
const [paywallFeature, setPaywallFeature] = useState<PaywallFeature>('polls_trial');

// Trigger:
setPaywallFeature('polls_trial');
setShowPaywallModal(true);

// In JSX:
<PaywallModal
  isOpen={showPaywallModal}
  onClose={() => setShowPaywallModal(false)}
  feature={paywallFeature}
  isParticipant={!isOrganizer}
  eventId={id}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bespoke inline upgrade modal in modules-config | Shared PaywallModal wrapping PaywallBanner | Phase 36 | One component handles all screens |
| Full-screen gate view in potluck-setup | Inline counter + PaywallModal on limit hit | Phase 36 | Organizers can access setup screen on free tier |
| No tier enforcement in polls/edit-event/event-details | Counters + PaywallModal + hide-on-free | Phase 36 | Consistent upgrade UX |

**Deprecated/outdated after Phase 36:**
- `showUpgradeModal` state + bespoke `<Modal>` block in `modules-config.tsx`: replaced by `showPaywallModal` + `<PaywallModal>`
- `if (!loading && isFree) { return <free tier gate>; }` block in `potluck-setup.tsx`: removed entirely

## Open Questions

1. **GlueStack Modal `size="full"` height behaviour**
   - What we know: The `size` variants in the modal style only set width (`w-full`). Height is not set by the variant.
   - What's unclear: Whether `size="full"` alone fills the screen vertically or needs explicit style override.
   - Recommendation: When implementing `PaywallModal`, test on both iOS and Android. Add `style={{ flex: 1 }}` to `ModalContent` if height does not fill.

2. **PaywallBanner CTA — Alert removal scope**
   - What we know: The current `handleUpgradeCta` in `PaywallBanner.tsx` uses `Alert.alert`. The CONTEXT.md requires the modal to stay open behind the browser.
   - What's unclear: Whether to modify `PaywallBanner.tsx` directly or override the CTA from `PaywallModal`.
   - Recommendation: Modify `PaywallBanner.tsx` to call `WebBrowser.openBrowserAsync` directly. The component is not used anywhere else yet, so this is safe.

3. **Potluck counter position**
   - What we know: Counter shows when `categories.length >= 2`. Screen is a ScrollView with category cards.
   - What's unclear: Exact placement — above category cards, below header text, or near the "Add New Category" button.
   - Recommendation: Place below the header text block, above the first category card. This is a Claude's Discretion area.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `apps/gatherly-mobile/components/PaywallBanner.tsx` — full component code read
- Direct file inspection: `apps/gatherly-mobile/app/modules-config.tsx` — bespoke upgrade modal identified
- Direct file inspection: `apps/gatherly-mobile/app/potluck-setup.tsx` — full-screen gate identified
- Direct file inspection: `apps/gatherly-mobile/app/polls.tsx` — no tier awareness confirmed
- Direct file inspection: `apps/gatherly-mobile/app/edit-event.tsx` — no participant cap logic confirmed
- Direct file inspection: `apps/gatherly-mobile/app/event-details.tsx` — no planTier usage confirmed
- Direct file inspection: `apps/gatherly-mobile/components/ui/modal/index.tsx` — `size="full"` variant confirmed
- Direct file inspection: `apps/api/src/routes/modules.ts` — API error shapes confirmed: `trial_limit_reached`, `upgrade_required`
- Direct file inspection: `apps/api/src/routes/events.ts` — `participant_cap_reached` error confirmed, cap=20
- Direct file inspection: `apps/gatherly-mobile/app/api/events.ts` — `TEvent.planTier` field confirmed
- Direct file inspection: `apps/gatherly-mobile/package.json` — all required packages confirmed present

### Secondary (MEDIUM confidence)
- Phase 35 RESEARCH.md — prior research on PaywallBanner architecture (stable, authored 2026-03-28)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs required
- Architecture: HIGH — all bespoke implementations read directly; exact change points identified
- Pitfalls: HIGH — all based on direct codebase inspection, not inference

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable codebase; no fast-moving dependencies)
