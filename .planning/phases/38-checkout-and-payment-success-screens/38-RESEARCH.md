# Phase 38: Checkout and Payment Success Screens - Research

**Researched:** 2026-04-07
**Domain:** React Native / Expo Router screen flow, form input, stub payment UX
**Confidence:** HIGH

## Summary

Phase 38 adds two new screens to the existing upgrade flow: a Checkout screen and a Payment Success screen. Both screen templates already exist (`Checkout.png`, `Success.png`). The work is purely mobile UI — no real payment processing, no new backend routes (the `PATCH /api/events/:id/upgrade` stub already exists from Phase 34). The primary technical domains are: Expo Router screen registration, React Native keyboard-avoiding form layout, dummy card validation with client-side state, and the existing `refreshEvents()` + `router.replace()` upgrade pattern.

The Checkout screen collects cardholder name, card number, expiry (MM/YY), and CVV in a standard vertical form with a `KeyboardAvoidingView`. Any non-empty values pass validation — no real Stripe integration. Tapping "Pay and Activate Event" calls `PATCH /api/events/:id/upgrade`, then navigates to the Success screen passing order metadata as route params. The Success screen is read-only and shows a confirmation card; its "Go to Event Dashboard" button calls `refreshEvents()` then `router.replace('/event-details?id=...')`.

The PaywallModal currently opens `expo-web-browser` when "Upgrade" is pressed. This must be changed to navigate to `checkout?eventId=...` instead, closing the modal and pushing the new screen onto the stack.

**Primary recommendation:** Two new file-based routes (`app/checkout.tsx`, `app/payment-success.tsx`), registered in `_layout.tsx` inside the auth guard. PaywallModal "Upgrade" press becomes `router.push('/checkout?eventId=...')` + `onClose()`. Form state is local `useState` strings. Submit calls the existing upgrade API, then `router.replace('/payment-success?...')` with metadata stringified as params.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | already installed | File-based routing, `useLocalSearchParams`, `useRouter` | All existing screens use this |
| react-native TextInput | built-in | Card form fields | All other forms in this codebase use RN TextInput directly |
| react-native KeyboardAvoidingView | built-in | Prevent keyboard from obscuring form inputs | Used in `edit-wishlist-item.tsx` and `potluck-setup.tsx` |
| GlueStack UI (Text, Pressable, Button) | already installed | Labels, CTA button, icon buttons | Project-wide standard |
| lucide-react-native | already installed | Icons (check circle, shield, credit card, etc.) | Used throughout the app |
| react-native-safe-area-context SafeAreaView | already installed | Screen layout wrapper | Used in `pricing.tsx`, `potluck-setup.tsx` |
| AppHeader | local component | Back button + "Checkout" title | All authenticated screens use AppHeader |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eventsApi (local) | — | `upgradeEvent` method to call `PATCH /api/events/:id/upgrade` | Called on form submit |
| EventsContext `refreshEvents()` | — | Refresh event list after upgrade so `planTier` reflects 'premium' | Called on Success screen before navigating to dashboard |

### No New Packages Needed

No new `npm install` required. All needed libraries are already installed.

## Architecture Patterns

### Recommended File Structure

```
apps/gatherly-mobile/app/
├── checkout.tsx            # NEW — card form, order summary, Express Pay row
├── payment-success.tsx     # NEW — confirmation screen with plan card
└── _layout.tsx             # MODIFIED — register two new Stack.Screen entries
```

### Pattern 1: New Screen Registration in _layout.tsx

**What:** Add two `Stack.Screen` entries inside the `Stack.Protected guard={!!session}` block.
**When to use:** All authenticated screens follow this pattern.

```tsx
// Source: apps/gatherly-mobile/app/_layout.tsx (existing pattern)
<Stack.Screen
  name="checkout"
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="payment-success"
  options={{ headerShown: false }}
/>
```

### Pattern 2: Screen receives eventId via useLocalSearchParams

**What:** Both new screens receive `eventId` (and the Success screen also receives order metadata) via query params.
**Example:**

```tsx
// Source: apps/gatherly-mobile/app/pricing.tsx (existing pattern)
const { eventId = "" } = useLocalSearchParams<{ eventId: string }>();
```

For Success screen, pass all metadata as route params from Checkout:

```tsx
// Checkout.tsx navigates to Success
router.replace(
  `/payment-success?eventId=${eventId}&eventName=${encodeURIComponent(eventName)}&amountPaid=49.00&transactionId=${txId}`
);
```

### Pattern 3: Keyboard-Avoiding Form Layout

**What:** Wrap form in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.
**When to use:** Any screen with TextInput fields — standard across this codebase.

```tsx
// Source: apps/gatherly-mobile/app/edit-wishlist-item.tsx (existing pattern)
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
  <ScrollView>
    {/* form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Pattern 4: TextInput for Form Fields

**What:** React Native `TextInput` with inline styles (not GlueStack Input component). Matches existing form screens.
**When to use:** All text entry in this codebase uses RN TextInput directly.

```tsx
// Source: apps/gatherly-mobile/app/edit-wishlist-item.tsx (existing pattern)
<TextInput
  value={cardNumber}
  onChangeText={setCardNumber}
  placeholder="0000 0000 0000 0000"
  keyboardType="number-pad"
  style={{
    fontSize: 15,
    color: "#111827",
    paddingVertical: 4,
  }}
/>
```

### Pattern 5: Upgrade API Call + refreshEvents + Navigate

**What:** The established v2.3 upgrade flow.
**Source:** STATE.md decision: "v2.3 upgrade flow: PATCH /api/events/:id/upgrade -> refreshEvents() -> navigate back"
**When to use:** Whenever plan_tier should be set to 'premium'.

```tsx
// Checkout.tsx submit handler
async function handleSubmit() {
  if (!cardholderName.trim() || !cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
    // show error
    return;
  }
  setLoading(true);
  try {
    await eventsApi.upgradeEvent(eventId);
    // Generate a dummy transaction ID
    const txId = `#TH-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;
    router.replace(`/payment-success?eventId=${eventId}&...`);
  } catch (err) {
    // show error
  } finally {
    setLoading(false);
  }
}
```

### Pattern 6: PaywallModal "Upgrade" Press — Navigate Instead of WebBrowser

**What:** The current `handleUpgrade()` in `PaywallModal.tsx` calls `WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL)`. This must be replaced with navigation to the Checkout screen.
**Change required:**

```tsx
// PaywallModal.tsx — add router, pass eventId correctly, navigate on Upgrade press
const router = useRouter();

function handleUpgrade() {
  onClose();
  router.push(`/checkout?eventId=${eventId}`);
}
```

`eventId` prop must be non-optional (or at minimum used). The prop already exists on `PaywallModalProps` but is currently unused.

### Pattern 7: Success Screen — refreshEvents before dashboard navigation

**What:** On "Go to Event Dashboard", call `refreshEvents()` first so the event list has `planTier = 'premium'` before returning to the event hub.

```tsx
// payment-success.tsx
const { refreshEvents } = useEvents();
const router = useRouter();

async function handleGoToDashboard() {
  await refreshEvents();
  router.replace(`/event-details?id=${eventId}`);
}
```

### Anti-Patterns to Avoid

- **Using GlueStack Input component for card fields:** The project uses RN `TextInput` directly for form fields — not the GlueStack `Input` component, which conflicts with NativeWind variant system in some cases (see STATE.md PaywallBanner CTA note).
- **Using `router.push` for Success navigation:** Use `router.replace` so the user can't back-navigate to Checkout after payment.
- **Storing real card details anywhere:** This is a stub. Accept any non-empty input. Never log or transmit card field values.
- **Calling refreshEvents() from Checkout screen:** Call it from the Success screen's dashboard button, not immediately after upgrade. The Success screen is purely confirmation — data refresh happens on the way back to the dashboard.
- **Navigating with `as never` unnecessarily:** Only needed for onboarding routes that Expo Router strict types don't include. These new routes will be registered in `_layout.tsx` and should be navigable normally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card field formatting | Custom input masking | Leave as plain TextInput — no masking needed for dummy stub | Phase scope is explicitly dummy — any non-empty input passes |
| Transaction ID | UUID library | `Math.random()` prefixed string matching Success.png format (`#TH-6921-46`) | Stub only, no real payment processor |
| Payment processing | API payment route | `PATCH /api/events/:id/upgrade` already exists | INFRA-05 stub already lands in Phase 34 |
| Navigation guards | Custom auth check | `Stack.Protected guard={!!session}` already handles it | All authenticated routes use this; just register the new screens |

**Key insight:** The entire payment flow is a UI stub. The only real side-effect is the existing upgrade API call. All complexity is in matching the screen templates faithfully.

## Common Pitfalls

### Pitfall 1: PaywallModal eventId prop currently optional and unused
**What goes wrong:** `PaywallModal` has `eventId?: string` as optional prop. Callers like `potluck-setup.tsx` pass it, but `PaywallModal.tsx` doesn't forward it to `handleUpgrade()`. Navigation to Checkout will push without an eventId.
**Why it happens:** Phase 35 comments in `PaywallBanner.tsx` explicitly note "eventId prop is optional and intentionally unused in Phase 35 — acts as Phase 36 routing hook only."
**How to avoid:** In `PaywallModal.tsx`, use `eventId` inside `handleUpgrade()` to build the checkout route. Verify all call sites pass `eventId`.
**Warning signs:** Checkout screen shows with an empty eventId, upgrade API call fails with 404/403.

### Pitfall 2: pricing.tsx also has a WebBrowser CTA that needs updating
**What goes wrong:** `app/pricing.tsx` has its own `handleRequestAccess()` that calls `WebBrowser.openBrowserAsync`. This screen is reached independently (not through PaywallModal). It also needs to navigate to Checkout — but currently only enables when `eventId` is non-empty.
**Why it happens:** Phase 37 completed pricing screen as a stub; Phase 38 is the first phase to add real checkout navigation.
**How to avoid:** Update `pricing.tsx` Upgrade button to `router.push('/checkout?eventId=${eventId}')` instead of WebBrowser. Keep the `disabled={!eventId}` guard.
**Warning signs:** Tapping "Upgrade" from the pricing screen still opens external browser.

### Pitfall 3: Back navigation from Success screen
**What goes wrong:** Using `router.push` to navigate to Success means the user can press back and see the Checkout form again (awkward after "payment").
**Why it happens:** Default push adds to navigation stack.
**How to avoid:** Use `router.replace('/payment-success?...')` from Checkout. The back button on Success should go to event dashboard, not Checkout.
**Warning signs:** Back gesture on Success screen returns to Checkout form.

### Pitfall 4: refreshEvents() not awaited on dashboard navigation
**What goes wrong:** If `refreshEvents()` is not awaited before `router.replace('/event-details?id=...')`, the event hub may still show `planTier = 'free'` and display locked premium modules.
**Why it happens:** refreshEvents is async; navigation is synchronous. Without `await`, the screen renders with stale state.
**How to avoid:** Always `await refreshEvents()` before the navigation call. Show a loading spinner on the "Go to Event Dashboard" button during the await.
**Warning signs:** Event hub still shows paywall banners after completing checkout.

### Pitfall 5: Express Pay row is decorative (Apple Pay / Google Pay buttons)
**What goes wrong:** Attempting to wire up real Apple Pay or Google Pay in a stub payment flow.
**Why it happens:** Checkout.png shows "Apple Pay" and "Google Pay" buttons that look actionable.
**How to avoid:** Render the Express Pay row as a visual divider row only — buttons can show an `Alert.alert("Coming soon")` or simply be non-functional placeholders. The success criteria only requires card form submission to work.
**Warning signs:** Spending time on native payment sheet integration.

## Code Examples

### eventsApi.upgradeEvent — add to app/api/events.ts

```typescript
// Add to eventsApi object in apps/gatherly-mobile/app/api/events.ts
upgradeEvent: async (id: string): Promise<TEvent> => {
  const response = await apiClient.patch(`/api/events/${id}/upgrade`);
  return response.data;
},
```

### Checkout screen skeleton

```tsx
// apps/gatherly-mobile/app/checkout.tsx
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { AppHeader } from "@/components/AppHeader";
import { eventsApi } from "./api/events";
import { useEvents } from "./contexts/EventsContext";

export default function CheckoutScreen() {
  const { eventId = "", eventName = "Standard Plan" } =
    useLocalSearchParams<{ eventId: string; eventName: string }>();
  const router = useRouter();
  const { state: { events } } = useEvents();

  const event = events.find((e) => e.id === eventId);

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!cardholderName.trim() || !cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
      Alert.alert("Missing details", "Please fill in all card fields.");
      return;
    }
    setLoading(true);
    try {
      await eventsApi.upgradeEvent(eventId);
      const txId = `#TH-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;
      const last4 = cardNumber.replace(/\s/g, "").slice(-4) || "1234";
      router.replace(
        `/payment-success?eventId=${eventId}&eventName=${encodeURIComponent(event?.name ?? "Standard Plan")}&last4=${last4}&txId=${encodeURIComponent(txId)}`
      );
    } catch {
      Alert.alert("Payment failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["bottom"]}>
      <AppHeader title="Checkout" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Order summary, Express Pay row, card form, Pay button */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### Payment Success screen skeleton

```tsx
// apps/gatherly-mobile/app/payment-success.tsx
import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useEvents } from "./contexts/EventsContext";

export default function PaymentSuccessScreen() {
  const { eventId, eventName, last4, txId } =
    useLocalSearchParams<{
      eventId: string;
      eventName: string;
      last4: string;
      txId: string;
    }>();
  const router = useRouter();
  const { refreshEvents } = useEvents();
  const [loading, setLoading] = useState(false);

  async function handleGoToDashboard() {
    setLoading(true);
    await refreshEvents();
    router.replace(`/event-details?id=${eventId}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Green checkmark, "Payment Successful!" headline */}
        {/* Active Plan card: event name, amount, payment method (Visa •••• last4), txId */}
        {/* "Go to Event Dashboard" button */}
        {/* "View Receipt" secondary link (no-op or Alert for now) */}
        {/* "Need help with your plan?" footer */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### _layout.tsx Stack.Screen additions

```tsx
// Inside Stack.Protected guard={!!session} block in app/_layout.tsx
<Stack.Screen
  name="checkout"
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="payment-success"
  options={{ headerShown: false }}
/>
```

### PaywallModal upgrade button change

```tsx
// PaywallModal.tsx — replace handleUpgrade function
const router = useRouter(); // add at top of component

function handleUpgrade() {
  onClose();
  router.push(`/checkout?eventId=${eventId ?? ""}`);
}
```

## Checkout.png Template Analysis

From visual inspection of `Checkout.png`:

**Order Summary section:**
- Gray "Summer Gala 2024" event name text
- "Standard Plan" in bold
- "$19.00" price (we show $49.00 to match Success.png — use the Success.png value as source of truth)
- Small event cover image thumbnail on the right

**Express Pay section:**
- "Express Pay" label, then "OR PAY WITH CARD" divider text
- Two buttons: black "Apple Pay" button, white/outlined "Google Pay" button

**Payment Method section:**
- "SECURE PAYMENT" badge (green shield icon + text) on the right of the section header
- "CARDHOLDER NAME" label + "John Doe" placeholder TextInput
- "CARD NUMBER" label + "0000 0000 0000 0000" placeholder + card icon
- Two-column row: "EXPIRY DATE" (MM/YY) and "CVV" (123)
- Teal/green "Pay and Activate Event" CTA button

**Footer:** "Secure one-time payment powered by Stripe" + links to Terms and Privacy Policy

## Success.png Template Analysis

From visual inspection of `Success.png`:

**Header:** "GATHERLY" text centered at top
**Hero:** Large teal circular checkmark icon
**Headline:** "Payment Successful!" bold
**Subtext:** "Your Standard Plan for the **Summer Gala 2024** is now active."

**Active Plan card:**
- "ACTIVE PLAN" badge
- Event cover image thumbnail + "Standard Plan" name
- "Amount Paid" → "$49.00"
- "Payment Method" → Visa card icon + "Visa •••• 1234"
- "Transaction ID" → "#TH-6921-46" format

**Footer info:** "A confirmation email has been sent to your registered address."
**Primary CTA:** Teal "Go to Event Dashboard" button
**Secondary link:** "View Receipt" (gray text)
**Bottom:** "Need help with your plan?" (small text)

**No back button on Success screen** — it's a terminal screen. The user exits via "Go to Event Dashboard".

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebBrowser for upgrade CTA | Navigate to in-app Checkout screen | Phase 38 | PaywallModal and pricing.tsx both change |
| No checkout flow | Two-screen checkout + success | Phase 38 | New screens, two new route registrations |

**Still stubs:**
- Express Pay (Apple Pay / Google Pay): decorative only in this phase
- "View Receipt": no-op (Alert or disabled) — no receipt generation
- Confirmation email: backend does not send email on upgrade (fire-and-forget pattern, would need emailService call added to upgrade route if desired — out of scope for this phase)

## Open Questions

1. **Amount shown in Order Summary (Checkout.png shows $19, Success.png shows $49)**
   - What we know: These are placeholder values in the template images. No real pricing is defined yet.
   - What's unclear: Should we pick one number and hardcode it consistently, or read it from a constant?
   - Recommendation: Define a single `PREMIUM_PRICE_DISPLAY = "$49.00"` constant in `constants/upgrades.ts` and use it in both screens. $49.00 matches the Success.png confirmation.

2. **Event name in Checkout template**
   - What we know: Checkout.png shows the event name ("Summer Gala 2024") in the order summary. The event name is available in `EventsContext`.
   - What's unclear: Should we pass eventName as a param or read it from context inside the screen?
   - Recommendation: Read from `EventsContext` via `events.find(e => e.id === eventId)?.name` — no need to pass as param, reduces URL length and avoids encoding issues.

3. **pricing.tsx "Upgrade" button behavior after Phase 38**
   - What we know: pricing.tsx currently calls WebBrowser; PaywallModal also calls WebBrowser.
   - What's unclear: Success criteria only mentions PaywallModal's "Upgrade" button — does pricing.tsx also need updating?
   - Recommendation: Yes, update both. They share the same user intent (upgrade) and should both navigate to Checkout for consistency.

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `apps/gatherly-mobile/app/_layout.tsx` (route registration pattern)
- Codebase inspection — `apps/gatherly-mobile/app/pricing.tsx` (pricing screen pattern)
- Codebase inspection — `apps/gatherly-mobile/components/PaywallModal.tsx` (current upgrade CTA behavior)
- Codebase inspection — `apps/gatherly-mobile/app/edit-wishlist-item.tsx` (KeyboardAvoidingView + TextInput pattern)
- Codebase inspection — `apps/gatherly-mobile/app/api/events.ts` (eventsApi structure, TEvent type)
- Codebase inspection — `apps/api/src/routes/events.ts` lines 444-461 (PATCH /api/events/:id/upgrade implementation)
- `.planning/STATE.md` (v2.3 upgrade flow decision, isFree pattern, PaywallModal pattern, isParticipant threading)
- Screen templates — `Checkout.png`, `Success.png` (visual design reference)

### Secondary (MEDIUM confidence)
- `.planning/phases/37-paywall-polish/37-UAT.md` (understanding Phase 37 scope / what PaywallModal should do post-37)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, patterns verified in codebase
- Architecture: HIGH — verified against existing screen patterns (pricing.tsx, edit-wishlist-item.tsx, _layout.tsx)
- Pitfalls: HIGH — identified from direct codebase inspection of PaywallModal, routing patterns, and STATE.md decisions
- Screen template fidelity: HIGH — both PNG templates read and analyzed

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase; no external library changes expected)
