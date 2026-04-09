# Phase 39: Navigation Architecture - Research

**Researched:** 2026-04-09
**Domain:** Expo Router 6 tab navigation, @gorhom/bottom-sheet v5 modal sheets, React Native navigation patterns
**Confidence:** HIGH (verified with official docs and current codebase inspection)

## Summary

The app uses Expo Router 6.0.23 with a flat Stack at the root (`app/_layout.tsx`) containing a `(tabs)` group (Events, Profile) and all event screens pushed as full stack screens. The goal is to introduce event-contextual tabs that replace the global tab bar when inside an event, and convert two sub-screens (`edit-event-details`, `manage-exclusions`) and `edit-wishlist-item` into `@gorhom/bottom-sheet` modal sheets instead of stack pushes.

The project already has `@gorhom/bottom-sheet` v5.2.8 installed and a GlueStack UI wrapper for it (`components/ui/bottomsheet/index.tsx`). The `(tabs)/index.tsx` and `my-wishlist.tsx` already use `BottomSheet` (imperative ref API) directly. The `BottomSheetModal` API (present/dismiss via ref) is the right choice for sheets that are triggered from user actions rather than always-mounted.

The key architectural challenge is the event-contextual tab bar swap. The safest, most maintainable pattern for Expo Router 6 is a nested route group: `app/(event)/[id]/(event-tabs)/` containing the event hub and its sibling screens, with a custom `_layout.tsx` that renders a bottom tab bar scoped to the event. The global `(tabs)` group remains unchanged. When the user taps an event card from the Events tab, they navigate into the `(event)/[id]/(event-tabs)/hub` route, which activates the event-level tab bar and hides the global tabs automatically through nesting.

**Primary recommendation:** Use nested route groups for event-contextual tabs (`(event)/[id]/(event-tabs)/`) and `BottomSheetModal` with `snapPoints={['95%']}` + `enableDynamicSizing={false}` for full-height sheets.

---

## Standard Stack

### Core (already installed, no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | 6.0.23 | File-based navigation, Stack + Tabs | Framework choice; v6 has nested tabs support |
| @gorhom/bottom-sheet | 5.2.8 | Full-height modal sheets | Already installed; project wrapper exists in `components/ui/bottomsheet/` |
| react-native-reanimated | ~4.1.0 | Animations for sheets | Required peer dep for gorhom v5 |
| react-native-gesture-handler | ^2.30.0 | Gesture handling for sheets | Required peer dep for gorhom v5 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-safe-area-context | ^5.6.1 | Safe area insets inside sheets | All sheets need bottom safe area padding |
| expo-haptics | ^55.0.9 | Haptic feedback on tab press | Optional tactile feedback on event tab switches |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended File Structure

```
app/
├── (tabs)/                          # Global tab context (Events, Profile)
│   ├── _layout.tsx                  # Tabs layout — Events + Profile only
│   ├── index.tsx                    # Events list screen
│   └── profile.tsx                  # Profile screen
├── (event)/                         # Event context group (no tab bar at this level)
│   └── [id]/                        # Dynamic segment: event ID
│       ├── _layout.tsx              # Stack wrapper hiding global tabs; provides EventProvider scoped to ID
│       └── (event-tabs)/            # Event-level tab bar group
│           ├── _layout.tsx          # Event Tabs layout (Hub, Gift Exchange, Modules, etc.)
│           ├── hub.tsx              # Event Hub — the landing screen (tap 2)
│           ├── gift-exchange.tsx    # Wishlist/gift exchange tab
│           ├── manage.tsx           # Edit Event / organizer management tab
│           └── more.tsx             # Polls, RSVP, Potluck (overflow tab or dynamic)
├── edit-event-details.tsx           # CONVERTED: no longer a stack screen
├── manage-exclusions.tsx            # CONVERTED: no longer a stack screen
├── edit-wishlist-item.tsx           # CONVERTED: no longer a stack screen
└── _layout.tsx                      # Root Stack — adds (event) route, removes old event screens
```

> **Note on route migration:** `event-details.tsx` becomes the entry point that navigates into `(event)/[id]/(event-tabs)/hub`. The old `event-details.tsx` can be kept as a redirect shim or renamed. Files converted to sheets (`edit-event-details`, `manage-exclusions`, `edit-wishlist-item`) should be removed from the root Stack's screen list and rendered as `BottomSheetModal` components inside their parent screens.

### Pattern 1: Nested Route Group for Event Context Tabs

**What:** A route group `(event)/[id]/(event-tabs)/` creates a nested tab navigator scoped to a single event. Because it is nested inside the outer Stack (`app/_layout.tsx`), navigating into it pushes onto the stack and the global `(tabs)` tab bar is naturally hidden — the nested tabs replace it visually.

**When to use:** When a section of the app has its own primary navigation (distinct tab bar) that should only appear while in that section.

**How global tabs hide:** In Expo Router, the global `(tabs)` tab bar is only visible when a `(tabs)` route is the active leaf. Once the user pushes a non-(tabs) screen (the `(event)` group), the global tab bar disappears automatically because it belongs to the `(tabs)` layout which is no longer the active layout. No custom hide/show logic needed.

**How event tabs persist:** All screens within `(event)/[id]/` that belong to `(event-tabs)/` automatically show the event tab bar since they are children of that Tabs layout. Screens like `edit-event`, `modules-config`, and `potluck-setup` that need to stay full-screen stacks can be added as `Stack.Screen` entries inside `(event)/[id]/_layout.tsx` — they remain part of the event context stack but above the tab bar.

```typescript
// app/(event)/[id]/_layout.tsx
// Source: Expo Router docs — Nesting navigators
import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tab group — event hub and its tabs */}
      <Stack.Screen name="(event-tabs)" options={{ headerShown: false }} />
      {/* Full-screen event screens that stay within event context */}
      <Stack.Screen name="edit-event" options={{ headerShown: false }} />
      <Stack.Screen name="modules-config" options={{ headerShown: false }} />
      <Stack.Screen name="potluck-setup" options={{ headerShown: false }} />
      <Stack.Screen name="polls" options={{ headerShown: false }} />
      <Stack.Screen name="rsvp" options={{ headerShown: false }} />
      <Stack.Screen name="potluck" options={{ headerShown: false }} />
      <Stack.Screen name="my-wishlist" options={{ headerShown: false }} />
      <Stack.Screen name="view-wishlists" options={{ headerShown: false }} />
    </Stack>
  );
}
```

```typescript
// app/(event)/[id]/(event-tabs)/_layout.tsx
// Source: Expo Router docs — Tabs layout
import { Tabs } from 'expo-router';
import { Home, Gift, Settings, MoreHorizontal } from 'lucide-react-native';

export default function EventTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0d9488' }}>
      <Tabs.Screen
        name="hub"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gift-exchange"
        options={{
          title: 'Gifts',
          tabBarIcon: ({ color, size }) => <Gift size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Pattern 2: Event Tab Structure (Claude's Discretion)

Based on the module system and the decision that wishlists are part of gift exchange, recommend this 3-tab structure for the event context:

| Tab | Screen | Content | Visibility |
|-----|--------|---------|------------|
| **Hub** | `hub.tsx` | Event details, module cards (current event-details content) | Always |
| **Gifts** | `gift-exchange.tsx` | My wishlist + view others' wishlists | When gift_exchange module active |
| **Manage** | `manage.tsx` | Edit event panel (organizer-only view with edit-event content) | Organizer only |

> For simplicity and stability, start with 3 fixed tabs. Hide tabs conditionally using `href: null` when the tab doesn't apply (e.g., hide Manage tab for participants). Dynamic module-based tabs introduce complexity and are better deferred. The Hub always shows module cards for navigation.

```typescript
// Hiding a tab conditionally — Source: Expo Router docs
<Tabs.Screen
  name="manage"
  options={{
    href: isOrganizer ? undefined : null, // null hides from tab bar
    title: 'Manage',
    tabBarIcon: ...
  }}
/>
```

### Pattern 3: Full-Height Modal Sheets with BottomSheetModal

**What:** `BottomSheetModal` (from `@gorhom/bottom-sheet`) is the correct API for sheets triggered by user actions (tap "Edit Details" → sheet slides up). Unlike the imperative `BottomSheet` ref pattern used in `(tabs)/index.tsx`, `BottomSheetModal` requires `BottomSheetModalProvider` and uses `ref.current?.present()` / `ref.current?.dismiss()`.

**When to use:** Any sheet that opens on user action from within a screen (edit-event-details, manage-exclusions, edit-wishlist-item).

**Full-height configuration:**
- `snapPoints={['95%']}` — near-full-height, with a small gap at top to signal it's a sheet
- `enableDynamicSizing={false}` — required when using `snapPoints` in v5 (dynamic sizing conflicts with fixed snap points)
- `enablePanDownToClose={true}` — swipe down to dismiss/cancel

```typescript
// Source: @gorhom/bottom-sheet v5 docs — BottomSheetModal usage
import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useRef, useCallback } from 'react';

// In parent component (e.g., edit-event.tsx):
const editDetailsSheetRef = useRef<BottomSheetModal>(null);

const openEditDetails = useCallback(() => {
  editDetailsSheetRef.current?.present();
}, []);

const closeEditDetails = useCallback(() => {
  editDetailsSheetRef.current?.dismiss();
}, []);

// In JSX:
<BottomSheetModal
  ref={editDetailsSheetRef}
  snapPoints={['95%']}
  enableDynamicSizing={false}
  enablePanDownToClose={true}
  backdropComponent={(props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  )}
>
  <BottomSheetView style={{ flex: 1 }}>
    <EditEventDetailsContent
      eventId={id}
      onSave={closeEditDetails}
      onCancel={closeEditDetails}
    />
  </BottomSheetView>
</BottomSheetModal>
```

**Provider requirement:** `BottomSheetModalProvider` must wrap the screen or be placed at a layout level above all screens that use `BottomSheetModal`. The root layout already has `GestureHandlerRootView` which is required. Add `BottomSheetModalProvider` inside `GestureHandlerRootView` in `_layout.tsx`.

### Pattern 4: Converting Stack Screens to Sheet-Rendered Components

`edit-event-details.tsx`, `manage-exclusions.tsx`, and `edit-wishlist-item.tsx` currently exist as standalone screen files navigated via `router.push()`. Converting them to sheets requires:

1. **Remove** `Stack.Screen` entries for these files from `_layout.tsx`
2. **Keep** the component logic but export as a named component rather than a default screen export (or keep the default export for safety while also using the content inside a sheet)
3. **Render** the `BottomSheetModal` in the parent screen (`edit-event.tsx` for details + exclusions; `my-wishlist.tsx` / wishlist screens for `edit-wishlist-item`)
4. **Replace** `router.push('/edit-event-details?id=...')` calls with `sheetRef.current?.present()`

> The existing `components/ui/bottomsheet/index.tsx` wrapper uses the trigger/portal pattern (always-mounted, snap-to-index). For programmatic `BottomSheetModal`, import directly from `@gorhom/bottom-sheet` — the GlueStack wrapper is designed for menu-style sheets, not full-height form sheets.

### Anti-Patterns to Avoid

- **Using `tabBarStyle: { display: 'none' }` on individual screens:** The context approach (custom tab bar visibility context + `useEffect` to hide/show) is fragile and causes flash-of-tab-bar on navigation. The nested route group pattern avoids this entirely.
- **Putting `edit-event` inside event tabs:** The user decision says `edit-event` stays full-screen but within the event context (tab bar persists). This means it should be a Stack.Screen inside `(event)/[id]/_layout.tsx`, not inside `(event-tabs)/`. Navigating to it pushes above the tabs but the event context stack remains active.
- **Using `enableDynamicSizing={true}` with fixed snapPoints:** This is a known v5 bug where dynamic sizing overrides snap point limits. Always `enableDynamicSizing={false}` when using `snapPoints`.
- **Animating into the event tabs with `router.push`:** Navigating from the events list to the event hub should use `router.push('/(event)/[id]/(event-tabs)/hub')`. Do not use `router.replace` unless you want to lose back navigation to the events list.
- **Nesting native tabs inside native tabs:** Expo Router v6 native tabs cannot be nested. Use JavaScript tabs (the `Tabs` component from `expo-router`, not the native variant) for the event-level tab bar.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-height slide-up sheets | Custom modal with Animated API | `BottomSheetModal` from `@gorhom/bottom-sheet` | Gesture handling, keyboard avoiding, backdrop, snap points — all handled |
| Hiding global tab bar when inside event | TabBar visibility context + useEffect | Nested route group `(event)/[id]/(event-tabs)/` | Nesting handles this naturally; context approach causes flash and lifecycle bugs |
| Back navigation from event tabs to events list | Custom back button with `router.replace` | Expo Router's built-in stack back gesture | Root Stack push preserves back navigation automatically |
| Tab bar with conditionally hidden tabs | Rendering tabs conditionally in JSX | `href: null` option on `Tabs.Screen` | The standard Expo Router way to hide tab entries without unmounting the route |

**Key insight:** Both primary challenges (sheet modals + context-switching tabs) are solved by existing library features. The architecture work is routing file structure and configuration, not custom UI or animation code.

---

## Common Pitfalls

### Pitfall 1: BottomSheetModal requires BottomSheetModalProvider

**What goes wrong:** `BottomSheetModal` silently fails to present, or throws a context error.
**Why it happens:** `BottomSheetModal` uses a React context to register itself, which must be provided by `BottomSheetModalProvider`.
**How to avoid:** Add `<BottomSheetModalProvider>` in `app/_layout.tsx` inside `GestureHandlerRootView` but outside any screen. It can wrap the entire `<Stack>`.
**Warning signs:** Sheet ref present() call does nothing; no error thrown.

### Pitfall 2: Dynamic sizing vs snapPoints conflict in v5

**What goes wrong:** Sheet opens but expands to full screen regardless of snapPoints, or snapping doesn't work.
**Why it happens:** `enableDynamicSizing` is `true` by default in v5 and overrides `snapPoints` behavior.
**How to avoid:** Always set `enableDynamicSizing={false}` when using explicit `snapPoints`.
**Warning signs:** Sheet always fills screen even with `snapPoints={['50%']}`.

### Pitfall 3: Route parameter passing to nested event tabs

**What goes wrong:** Event screens inside `(event)/[id]/(event-tabs)/` can't access the event ID, or `useLocalSearchParams` returns undefined.
**Why it happens:** Dynamic segment `[id]` is in the parent directory; tabs inside `(event-tabs)/` are at a deeper level and need to access the parent segment.
**How to avoid:** Use `useLocalSearchParams` with the correct segment name (`id`) — Expo Router makes ancestor dynamic params available to all child routes. Alternatively, wrap with an EventContext provider at the `(event)/[id]/_layout.tsx` level.
**Warning signs:** `id` is undefined in hub.tsx or gift-exchange.tsx.

### Pitfall 4: Event context screens (edit-event, etc.) losing the event tab bar

**What goes wrong:** User navigates to `edit-event` from within the event context and the event tab bar disappears.
**Why it happens:** If `edit-event.tsx` is registered at the root `_layout.tsx` Stack level rather than inside `(event)/[id]/_layout.tsx`, it pushes outside the event tab context entirely.
**How to avoid:** Move all event-context full-screen screens (`edit-event`, `modules-config`, `potluck-setup`, `polls`, `rsvp`, `potluck`, `my-wishlist`, `view-wishlists`) into `(event)/[id]/_layout.tsx` as Stack screens. Remove them from the root Stack.
**Warning signs:** Event tab bar disappears when navigating to edit-event from inside the event hub.

### Pitfall 5: Duplicate route registration

**What goes wrong:** Expo Router throws a warning or crash about duplicate route names.
**Why it happens:** After creating `(event)/[id]/(event-tabs)/hub.tsx`, the old `event-details.tsx` at root still exists in the root Stack registration.
**How to avoid:** Remove old `event-details.tsx` from root Stack.Screen list when the new `(event)` group is complete. Migrate any deep links that pointed to `/event-details?id=X` to `/(event)/X/(event-tabs)/hub`.
**Warning signs:** Expo Router dev warnings about duplicate screens or unexpected routing behavior.

### Pitfall 6: Keyboard avoiding in BottomSheetModal form sheets

**What goes wrong:** Keyboard covers form inputs inside the sheet (edit-event-details has text inputs, date pickers).
**Why it happens:** `BottomSheetView` has different keyboard avoiding behavior than `KeyboardAvoidingView`.
**How to avoid:** Use `BottomSheetScrollView` instead of `BottomSheetView` for sheets with text inputs. `@gorhom/bottom-sheet` has built-in keyboard handling that works with `BottomSheetScrollView`. Also use `BottomSheetTextInput` from `@gorhom/bottom-sheet` for text inputs inside the sheet (already imported in `components/ui/bottomsheet/index.tsx`).
**Warning signs:** Keyboard obscures inputs; user can't see what they're typing.

---

## Code Examples

### Full-Height Modal Sheet Setup (verified pattern)

```typescript
// Source: @gorhom/bottom-sheet v5 docs
// In app/_layout.tsx — add BottomSheetModalProvider
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Inside GestureHandlerRootView, wrapping <Stack>:
<GestureHandlerRootView style={{ flex: 1 }}>
  <BottomSheetModalProvider>
    <Stack>
      {/* ...screens... */}
    </Stack>
  </BottomSheetModalProvider>
</GestureHandlerRootView>
```

```typescript
// Source: @gorhom/bottom-sheet v5 docs — BottomSheetModal usage
// In edit-event.tsx — open edit-event-details as a sheet

import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useRef, useCallback } from 'react';

const editDetailsRef = useRef<BottomSheetModal>(null);

const handleOpenEditDetails = useCallback(() => {
  editDetailsRef.current?.present();
}, []);

// In JSX:
<Pressable onPress={handleOpenEditDetails}>
  <Text>Edit Details</Text>
</Pressable>

<BottomSheetModal
  ref={editDetailsRef}
  snapPoints={['95%']}
  enableDynamicSizing={false}
  enablePanDownToClose={true}
  backdropComponent={(props) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.5}
    />
  )}
>
  <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
    {/* EditEventDetailsContent component here */}
  </BottomSheetScrollView>
</BottomSheetModal>
```

### Hiding Event Tab conditionally (verified pattern)

```typescript
// Source: Expo Router docs — href: null to hide tab
// In app/(event)/[id]/(event-tabs)/_layout.tsx

import { useSession } from '@/app/contexts/AuthContext';

export default function EventTabsLayout() {
  const { user } = useSession();
  const isOrganizer = user?.participantId === undefined;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="hub" options={{ title: 'Hub', ... }} />
      <Tabs.Screen name="gift-exchange" options={{ title: 'Gifts', ... }} />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          href: isOrganizer ? undefined : null,
          tabBarIcon: ...
        }}
      />
    </Tabs>
  );
}
```

### Navigating to event hub from events list

```typescript
// Source: Expo Router docs — router.push with dynamic route
// In app/(tabs)/index.tsx — replace old event-details push:

// Old: router.push(`/event-details?id=${eventId}` as any)
// New:
router.push(`/(event)/${eventId}/(event-tabs)/hub` as any);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat root Stack with all screens | Nested route groups for context isolation | Expo Router v2+ | Enables natural tab bar scoping without custom hide/show logic |
| `BottomSheet` with imperative ref + snap-to-index | `BottomSheetModal` with `present()`/`dismiss()` | @gorhom/bottom-sheet v4+ | Cleaner API for action-triggered sheets; separate from always-mounted sheets |
| `enableDynamicSizing` true by default | Must set `enableDynamicSizing={false}` with snapPoints | @gorhom/bottom-sheet v5 | Breaking change from v4; explicit flag required |
| `react-native-gesture-handler` v1 | v2 required for @gorhom v5 | @gorhom v5 release | Already satisfied (project has gesture-handler ^2.30.0) |

**Deprecated/outdated:**
- `router.push('/event-details?id=X')`: Replace with `router.push('/(event)/X/(event-tabs)/hub')` after migration
- Root Stack.Screen entries for `edit-event-details`, `manage-exclusions`, `edit-wishlist-item`: Remove when sheet migration is complete
- Global Stack.Screen entries for event-context screens (`edit-event`, `modules-config`, etc.): Move into `(event)/[id]/_layout.tsx`

---

## Open Questions

1. **Tab count for event with all modules active**
   - What we know: Modules can include gift_exchange, potluck, polls, rsvp, white_elephant. Tabs are fixed (not dynamic) for stability.
   - What's unclear: If the Hub shows all module cards, is a dedicated Gifts tab still needed, or does Hub → Gift Exchange (1 tap from hub) meet the 2-tap guarantee without a separate Gifts tab?
   - Recommendation: Keep Gifts as a separate tab (it's the highest-frequency feature). Hub remains the event overview. 3-tab layout (Hub, Gifts, Manage) is clean and avoids dynamic tab complexity.

2. **edit-wishlist-item sheet location**
   - What we know: `edit-wishlist-item` is triggered from `my-wishlist.tsx` and potentially `view-wishlists.tsx`. Both become child screens inside `(event)/[id]/`.
   - What's unclear: Should the sheet be rendered inside `my-wishlist.tsx` directly, or at the `(event)/[id]/_layout.tsx` level for reuse from both screens?
   - Recommendation: Render inside `my-wishlist.tsx` first (simpler). If `view-wishlists.tsx` needs it later, lift to layout level.

3. **Back navigation UX from event context to events list**
   - What we know: The event context is pushed via `router.push` from the events list, so the hardware/gesture back goes naturally back to the events list.
   - What's unclear: The AppHeader `onBack` callback currently calls `router.back()`. Inside the event hub with tabs active, should the back button go to the events list (root of event context) or step through tab history?
   - Recommendation: On the event hub (`hub.tsx`), `onBack` should call `router.back()` which pops the entire `(event)` group back to the events list. On screens within the event (edit-event, etc.), `router.back()` is correct as it pops back to the event hub.

---

## Sources

### Primary (HIGH confidence)
- Expo Router v6 official docs — https://docs.expo.dev/router/advanced/tabs/
- Expo Router v6 official docs — https://docs.expo.dev/router/advanced/modals/
- Expo Router v6 official docs — https://docs.expo.dev/router/advanced/nesting-navigators/
- Expo Router v6 official docs — https://docs.expo.dev/router/advanced/stack/
- Expo Router v6 official docs — https://docs.expo.dev/router/advanced/custom-tabs/
- Expo Router v6 blog post — https://expo.dev/blog/expo-router-v6
- @gorhom/bottom-sheet v5 migration blog — https://gorhom.dev/react-native-bottom-sheet/blog/bottom-sheet-v5
- @gorhom/bottom-sheet v5 BottomSheetModal — https://gorhom.dev/react-native-bottom-sheet/modal/usage
- Codebase inspection: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `package.json`, `components/ui/bottomsheet/index.tsx`

### Secondary (MEDIUM confidence)
- Hide tab bar in Expo Router — https://coolsoftware.dev/blog/hide-tab-bar-expo-router-nested-stack/ (confirmed by Expo Router nesting docs)
- enableDynamicSizing conflict with snapPoints — https://github.com/gorhom/react-native-bottom-sheet/discussions/1783 (confirmed by multiple GitHub issues)

### Tertiary (LOW confidence)
- React Navigation with Expo Router 2026 guide — https://www.codesofphoenix.com/articles/expo/expo-router-nav (community article, not official)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from `yarn.lock` and `package.json`; no new packages needed
- Architecture (nested route groups): HIGH — verified against Expo Router v6 official docs; nesting pattern is standard
- BottomSheetModal API: HIGH — confirmed from official docs; `enableDynamicSizing={false}` flag confirmed from GitHub issues
- Event tab structure: MEDIUM — Claude's discretion; 3-tab recommendation is design judgment based on app content analysis
- Pitfalls: HIGH — all confirmed against official docs or known v5 breaking changes

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (Expo Router and @gorhom are relatively stable; v6 API is finalizing but core patterns are stable)
