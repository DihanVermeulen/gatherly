# Phase 35: Paywall Components - Research

**Researched:** 2026-03-28
**Domain:** React Native / Expo — shared paywall component + pricing screen
**Confidence:** HIGH — all findings from direct codebase inspection and official Expo docs

## Summary

Phase 35 builds two artifacts: a shared `PaywallBanner` component and a `pricing.tsx` screen. The entire phase is pure UI work on top of the existing stack — no new libraries required, no migrations, no API changes. All dependencies (`expo-web-browser`, `lucide-react-native`, GlueStack UI, React Native's `Alert`) are already installed and used elsewhere in the mobile app.

The key architectural finding is that the codebase already has three scattered, inconsistent upgrade UX implementations (a modal in `modules-config.tsx`, a full-screen gate in `potluck-setup.tsx`, and a banner in `modules-config.tsx` that uses teal instead of amber). Phase 35 replaces all of these exit ramps with two canonical artifacts. The new `PaywallBanner` must be a component that renders as a bottom-pinned inline card, not a modal. The pricing screen must be registered in `_layout.tsx` under `Stack.Protected` (organizer-only — magic-link participants have no "Request Access" path).

The `plansApi` client is scoped to Plan 35-01 and wraps the existing `PATCH /api/events/:id/upgrade` endpoint that was built in Phase 34. The upgrade flow in Phase 35 is purely demand-capture (external URL), not in-app purchase.

**Primary recommendation:** Build `PaywallBanner` as a standalone component file under `components/`, register `app/pricing.tsx` in `_layout.tsx`, and store the external URL as a constant in `constants/` alongside the existing `Colors.ts`.

## Standard Stack

All libraries are already installed — no new `npm install` commands needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-web-browser` | ~15.0.7 | Opens external Typeform/Tally URL | Already installed; used in `components/ExternalLink.tsx` |
| `lucide-react-native` | ^0.510.0 | Lock icon for banner | Already installed; `Lock` icon used in `modules-config.tsx` |
| GlueStack UI (`components/ui/`) | @gluestack-ui/core ^3.0.12 | Card, Text, Button, Pressable | Project standard — all screens use it |
| React Native `Alert` | Built-in | Confirmation dialog before external URL open | Pattern used in `potluck.tsx` and `potluck-setup.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-router` `useLocalSearchParams` | ~6.0.4 | Pricing screen reads `?eventId=X` | Pricing screen needs eventId to know which event context |
| `expo-router` `useRouter` | ~6.0.4 | Back navigation from pricing screen | Standard pattern in all screens |
| `useSession` from `./contexts/AuthContext` | internal | Detect organizer vs magic-link participant | `user.participantId !== undefined` = magic-link participant |
| `useEvents` from `./contexts/EventsContext` | internal | Access `refreshEvents()` after upgrade | Required by v2.3 upgrade flow spec |

### No New Installations Needed
The full required stack is present. `npm install --ignore-scripts` is the correct install command for `gatherly-mobile` (known monorepo constraint from project decisions).

## Architecture Patterns

### Recommended File Structure
```
apps/gatherly-mobile/
├── app/
│   └── pricing.tsx                  # New: pricing screen (Plan 35-02)
├── components/
│   └── PaywallBanner.tsx            # New: shared banner component (Plan 35-01)
│   └── (existing: AppHeader, OfflineBanner, ...)
└── constants/
    ├── Colors.ts                    # Existing
    └── upgrades.ts                  # New: UPGRADE_REQUEST_URL constant (Plan 35-01)
```

### Pattern 1: PaywallBanner as Bottom-Pinned Inline Card

**What:** A fixed-position card at the bottom of the screen, inside the safe area. Not dismissable. Visible whenever a lock condition is active.

**Key structural detail:** The banner is NOT rendered inside a modal or bottom sheet. The parent screen renders it as part of its layout, typically between the main ScrollView and the bottom of the screen. Use `position: 'absolute', bottom: 0` inside a View with `flex: 1` to pin it.

**Prop interface (derived from CONTEXT.md spec):**
```typescript
// Source: CONTEXT.md decisions + codebase pattern analysis
type PaywallFeature =
  | 'participant_cap'
  | 'potluck_trial'
  | 'polls_trial'
  | { type: 'module_locked'; moduleName: string };

type PaywallBannerProps = {
  feature: PaywallFeature;
  eventId: string;
  isParticipant: boolean; // true = magic-link user, no CTA shown
};
```

**Contextual headline mapping (from CONTEXT.md):**
```typescript
// Source: CONTEXT.md § Contextual Copy
function getHeadline(feature: PaywallFeature, isParticipant: boolean): string {
  if (isParticipant) return "Ask your organiser to upgrade this event";
  if (feature === 'participant_cap') return "Free events are limited to 20 guests";
  if (feature === 'potluck_trial') return "Upgrade for unlimited potluck categories";
  if (feature === 'polls_trial') return "Upgrade for unlimited polls";
  if (typeof feature === 'object' && feature.type === 'module_locked') {
    return `Unlock ${feature.moduleName} with Premium`;
  }
  return "Upgrade to Premium";
}
```

**Amber/gold color values (Claude's Discretion):**
- Background: `#f59e0b` (amber-500 in Tailwind default palette) — too orange-heavy
- Better gold: `#d97706` (amber-600) as background; `#fffbeb` (amber-50) for light fill
- Recommended: Use `#d97706` as card background with white text, or use `#fffbeb` fill with `#92400e` (amber-900) text and `#f59e0b` border for a more premium look
- Tailwind's default amber palette IS available in this project (used in `OfflineBanner.tsx` as `bg-amber-500`)

**NativeWind vs inline styles:** This project uses both. For new components, follow the pattern of existing screens that use inline styles (backgroundColor as hex) for colors not in the GlueStack token system. Since amber is not in the GlueStack custom token system but IS available as a Tailwind default class, either approach works. Inline style is safer — avoids potential NativeWind compilation issues with dynamic class names.

### Pattern 2: Pricing Screen as Stack Route (Not Tab)

**What:** `app/pricing.tsx` registered under `Stack.Protected` in `_layout.tsx`. Accessible only via `router.push('/pricing?eventId=X')`. Never in main tab navigation.

**Registration pattern (from `_layout.tsx` lines 113-178):**
```typescript
// Source: apps/gatherly-mobile/app/_layout.tsx
<Stack.Protected guard={!!session}>
  {/* ... existing screens ... */}
  <Stack.Screen
    name="pricing"
    options={{ headerShown: false }}
  />
</Stack.Protected>
```

**Screen parameter access:**
```typescript
// Source: consistent with all other screens (modules-config.tsx, potluck-setup.tsx)
const { eventId } = useLocalSearchParams<{ eventId: string }>();
```

### Pattern 3: External URL via expo-web-browser with Alert Confirmation

**What:** Tapping "Request Access" shows a native Alert first (confirming the user will leave the app), then opens the external URL in an in-app browser.

**Correct API (from official Expo docs):**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/webbrowser/
import * as WebBrowser from 'expo-web-browser';

const handleRequestAccess = () => {
  Alert.alert(
    "Request Premium Access",
    "You'll be taken to an external form to request Premium access.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL),
      },
    ]
  );
};
```

**Note:** `openBrowserAsync` (not `openAuthSessionAsync`) is correct here — no redirect URL needed, no auth session. Use `openBrowserAsync` per `ExternalLink.tsx` precedent.

### Pattern 4: Organizer vs Participant Discriminant

**What:** `user.participantId !== undefined` means magic-link participant (no upgrade CTA). Absence means full-account organizer (shows CTA).

**Source:** `useSession()` from `app/contexts/AuthContext.tsx`. The `User` type (auth.ts line 8) defines `participantId?: number` — present only for magic-link users. Already used in `polls.tsx` line 28: `const isOrganizer = user?.participantId === undefined;`

**Consistent usage:** Always derive from `useSession().user.participantId` — do not invent new auth checks.

### Pattern 5: plansApi Client

**What:** A thin API client that wraps `PATCH /api/events/:id/upgrade`. Place in `app/api/plans.ts` (new file, consistent with `modules.ts`, `events.ts`).

**The upgrade endpoint (from Phase 34, verified in events.ts):**
- `PATCH /api/events/:id/upgrade`
- Requires organizer JWT (`authenticateJWT` + `requireOrganizer`)
- Returns the full updated `TEvent` object
- Sets `plan_tier = 'premium'` — idempotent

**v2.3 upgrade flow (from STATE.md):** Call `PATCH /upgrade` → then `refreshEvents()` → then navigate back. `refreshEvents()` is exposed from `useEvents()` context.

### Anti-Patterns to Avoid

- **Don't use a modal for PaywallBanner.** CONTEXT.md explicitly says "not a modal or bottom sheet" — the inline card IS the locked content replacement.
- **Don't dismiss the banner.** No X/close button. The banner stays until the user navigates away.
- **Don't add a pricing link to the main tab nav.** The pricing screen is only reachable via upgrade CTAs.
- **Don't check `planTier === 'standard'`** — the correct values are `'free'` and `'premium'` (per v2.3 tier model in STATE.md; 'standard' was the old wrong value).
- **Don't use teal (`#0d9488`) for PaywallBanner.** The existing teal banners in `modules-config.tsx` are the OLD pattern being replaced. New banner must use amber/gold.
- **Don't await WebBrowser.openBrowserAsync** — fire and forget is fine; no in-app acknowledgement is expected after the user returns from the form (per CONTEXT.md).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| External URL opening | Custom `Linking.openURL` implementation | `WebBrowser.openBrowserAsync` | Already installed; in-app browser is better UX than system browser jump; precedent in `ExternalLink.tsx` |
| Confirmation dialog | Custom modal component | Native `Alert.alert` | Already used for confirmations in `potluck.tsx` and `potluck-setup.tsx`; consistent UX |
| Organizer detection | Custom auth check | `user?.participantId === undefined` from `useSession()` | Established discriminant pattern from STATE.md; used in polls.tsx, rsvp.tsx |
| App constant storage | Inline hardcoded string | `constants/upgrades.ts` | Single source of truth; `constants/Colors.ts` is the existing pattern for app-level constants |

**Key insight:** Everything needed is already in the codebase. The only new code is UI composition and one constant file.

## Common Pitfalls

### Pitfall 1: Banner Layout — Bottom Pinning in ScrollView Screens

**What goes wrong:** Placing the banner inside a `ScrollView` contentContainer causes it to scroll away with content instead of staying fixed at the bottom.

**Why it happens:** Screens in this app use `SafeAreaView > ScrollView` structure. Rendering the banner inside the ScrollView means it scrolls off.

**How to avoid:** Parent structure should be:
```
SafeAreaView (flex: 1)
├── AppHeader
├── ScrollView (flex: 1) — main content
└── PaywallBanner — outside the ScrollView, at the bottom
```
The banner sits between the ScrollView and the SafeAreaView bottom edge. No `position: absolute` needed — just correct flex ordering with the banner outside the scroll container.

**Warning signs:** Banner scrolls away when the user scrolls the content list.

### Pitfall 2: Pricing Screen eventId Param — Not Always Present

**What goes wrong:** Building the pricing screen without handling the `eventId` param being absent (e.g., if navigated to incorrectly during dev).

**Why it happens:** `useLocalSearchParams` returns `{}` if no params. Accessing `eventId` without a default causes undefined errors when calling `plansApi.upgrade(eventId)`.

**How to avoid:** Always default: `const { eventId = '' } = useLocalSearchParams<{ eventId: string }>()` and guard the upgrade CTA button with `disabled={!eventId}`.

### Pitfall 3: Stale planTier After Upgrade

**What goes wrong:** User taps "Request Access," the PATCH succeeds, the event cache still shows `planTier: 'free'`, locked screens remain locked.

**Why it happens:** `EventsContext` holds events in memory. Calling `eventsApi.upgrade()` directly without calling `refreshEvents()` afterwards leaves the local state stale.

**How to avoid:** Per STATE.md v2.3 upgrade flow spec — always `await refreshEvents()` before `router.back()` after a successful upgrade call. The pattern is: `PATCH /upgrade` → `refreshEvents()` → `router.back()`.

**Warning signs:** Screen still shows PaywallBanner immediately after "upgrading."

### Pitfall 4: Alert.alert on Android vs iOS Behavior

**What goes wrong:** `Alert.alert` confirmation title/body appears correctly on iOS but has slightly different rendering on Android.

**Why it happens:** React Native's `Alert.alert` is native — it wraps the platform's system dialog.

**How to avoid:** This is acceptable behavior — native dialogs are intentional. The `showToast` helper in `potluck-setup.tsx` uses `ToastAndroid` as a Platform-specific fallback but that pattern is not needed here since `Alert.alert` works cross-platform for confirmation dialogs.

### Pitfall 5: NativeWind amber class names not in safelist

**What goes wrong:** NativeWind may strip `bg-amber-*` classes if they don't appear in the safelist and aren't scanned from component files.

**Why it happens:** The tailwind.config.js safelist regex only covers GlueStack token names (`primary`, `secondary`, etc.). `amber` is a default Tailwind color, not a GlueStack token.

**How to avoid:** `OfflineBanner.tsx` already uses `bg-amber-500` via className and compiles correctly — this means amber classes ARE being picked up from the component content scan (`./components/**/*.{tsx}`). Safe to use amber className in `components/PaywallBanner.tsx`. Alternatively, use inline `style={{ backgroundColor: '#d97706' }}` for guaranteed safety.

## Code Examples

### PaywallBanner Component Skeleton

```typescript
// Source: pattern derived from modules-config.tsx + OfflineBanner.tsx + CONTEXT.md spec
import React from "react";
import { Alert, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Lock } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { UPGRADE_REQUEST_URL } from "@/constants/upgrades";

export type PaywallFeature =
  | "participant_cap"
  | "potluck_trial"
  | "polls_trial"
  | { type: "module_locked"; moduleName: string };

type Props = {
  feature: PaywallFeature;
  isParticipant: boolean;
};

export function PaywallBanner({ feature, isParticipant }: Props) {
  const headline = getHeadline(feature, isParticipant);

  const handleCTA = () => {
    Alert.alert(
      "Request Premium Access",
      "You'll be taken to an external form to request Premium access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL),
        },
      ]
    );
  };

  return (
    <View
      style={{
        margin: 16,
        marginBottom: 24,
        borderRadius: 16,
        padding: 16,
        backgroundColor: "#fffbeb",
        borderWidth: 1,
        borderColor: "#f59e0b",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Lock size={18} color="#92400e" />
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400e", flex: 1 }}>
          {headline}
        </Text>
      </View>
      {!isParticipant && (
        <Button
          onPress={handleCTA}
          style={{ backgroundColor: "#d97706", borderRadius: 10 }}
        >
          <ButtonText style={{ color: "#ffffff", fontWeight: "700" }}>
            Upgrade to Premium
          </ButtonText>
        </Button>
      )}
    </View>
  );
}
```

### Constants File

```typescript
// File: apps/gatherly-mobile/constants/upgrades.ts
// Source: CONTEXT.md § Upgrade CTA Flow
export const UPGRADE_REQUEST_URL =
  "https://form.typeform.com/to/PLACEHOLDER"; // Replace with actual URL at launch
```

### Pricing Screen Shell

```typescript
// File: apps/gatherly-mobile/app/pricing.tsx
// Source: pattern from potluck-setup.tsx + CONTEXT.md § Pricing Screen Layout
import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { UPGRADE_REQUEST_URL } from "@/constants/upgrades";
import { plansApi } from "./api/plans";
import { useEvents } from "./contexts/EventsContext";

export default function PricingScreen() {
  const { eventId = "" } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { refreshEvents } = useEvents();
  const [loading, setLoading] = useState(false);

  const handleRequestAccess = () => {
    Alert.alert(
      "Request Premium Access",
      "You'll be taken to an external form to request Premium access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["bottom"]}>
      <AppHeader title="Plans" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Free card */}
        {/* Premium card with "Request Access" CTA */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### plansApi Client

```typescript
// File: apps/gatherly-mobile/app/api/plans.ts
// Source: PATCH /api/events/:id/upgrade — verified in apps/api/src/routes/events.ts
import apiClient from "./client";
import { TEvent } from "./events";

export const plansApi = {
  upgrade: async (eventId: string): Promise<TEvent> => {
    const response = await apiClient.patch<TEvent>(`/api/events/${eventId}/upgrade`);
    return response.data;
  },
};
```

### _layout.tsx Registration

```typescript
// Source: apps/gatherly-mobile/app/_layout.tsx — add alongside existing Stack.Screen entries
<Stack.Screen
  name="pricing"
  options={{ headerShown: false }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal upgrade dialog in `modules-config.tsx` | Shared `PaywallBanner` component | Phase 35 | Consistent UX; old modal can be removed in Phase 36 |
| Full-screen free-tier gate in `potluck-setup.tsx` | Routes to `PaywallBanner` | Phase 35 | Old gate stays for now; Phase 36 will replace it |
| Teal (`#0d9488`) upgrade banner in modules-config | Amber/gold PaywallBanner | Phase 35 | Visual differentiation: teal = brand, amber = premium upsell |
| `planTier: 'free' \| 'standard'` type | `'free' \| 'premium'` | Phase 34 | Corrected in TEvent type — code already updated |

**Existing stubs to be aware of:**
- `modules-config.tsx` has its own upgrade modal (lines 131, 367-422) — it remains until Phase 36 reroutes it to the new pricing screen
- `potluck-setup.tsx` has its own free-tier gate (lines 616-684) — same, remains until Phase 36
- These are NOT removed in Phase 35; Phase 35 only builds the two new canonical artifacts

## Open Questions

1. **Where should `PaywallBanner` live — `components/` or `app/components/`?**
   - What we know: `OfflineBanner` and `AppHeader` are in `components/` (root level, not inside `app/`)
   - Recommendation: `components/PaywallBanner.tsx` — consistent with all other shared components

2. **Should the "Request Access" CTA in the pricing screen also call `plansApi.upgrade()` or just open the external URL?**
   - What we know: The pricing screen CTA per CONTEXT.md is demand-capture only (external Typeform/Tally form). The actual plan upgrade is a manual backend process.
   - Recommendation: The pricing screen CTA opens the external URL only — no `PATCH /upgrade` call from pricing screen. The upgrade API is reserved for Phase 36 when automation is added.
   - **This is a planning decision, not a research gap.** The CONTEXT.md spec says "no in-app acknowledgement needed."

3. **Should `PaywallBanner` receive `eventId` as a prop or pull it from router params?**
   - What we know: The component is rendered inside screens that already have `eventId` in scope (from `useLocalSearchParams`). Passing it as a prop is simpler.
   - Recommendation: Prop — keeps the component decoupled from routing.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `apps/gatherly-mobile/app/_layout.tsx`, `modules-config.tsx`, `potluck-setup.tsx`, `polls.tsx`, `rsvp.tsx`, `contexts/AuthContext.tsx`, `contexts/EventsContext.tsx`, `api/events.ts`, `api/modules.ts`, `constants/Colors.ts`, `components/ExternalLink.tsx`, `components/OfflineBanner.tsx`, `components/AppHeader.tsx`
- Direct API inspection — `apps/api/src/routes/events.ts` (`PATCH /upgrade` endpoint), `apps/api/src/routes/modules.ts` (error codes `upgrade_required`, `trial_limit_reached`, `participant_cap_reached`)
- `apps/gatherly-mobile/package.json` — confirms `expo-web-browser ~15.0.7` installed
- `apps/gatherly-mobile/tailwind.config.js` — confirms amber classes available

### Secondary (MEDIUM confidence)
- https://docs.expo.dev/versions/latest/sdk/webbrowser/ — `openBrowserAsync` API signature verified; confirms correct function for non-auth external URL opening

### Tertiary (LOW confidence)
- None needed — all required information sourced from codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json; all libraries confirmed present
- Architecture patterns: HIGH — derived from direct code inspection of all relevant screens
- Pitfalls: HIGH — identified from actual code structure and established patterns in the codebase
- Amber color values: MEDIUM — Tailwind defaults; values are well-known but visual judgment is Claude's Discretion

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable codebase; no external API changes expected)
