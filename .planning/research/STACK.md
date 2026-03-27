# Technology Stack — Paywall UX Milestone (Stub Payment)

**Project:** Gatherly Mobile (apps/gatherly-mobile)
**Milestone:** Paywall UX — Per-Event Upgrade, Pricing Screen, Stub Payment CTA
**Researched:** 2026-03-27
**Scope:** NEW additions only for the paywall UX milestone. Existing validated stack (Expo 54, GlueStack UI, NativeWind, Expo Router 6, TanStack Query v5, expo-secure-store, react-native-reanimated 4.1, react-native-gesture-handler 2.30, @gorhom/bottom-sheet 5.x) is unchanged.

---

## Summary

**Net new npm installs for this milestone: 0.**

The paywall UX milestone — pricing/plans screen, per-event upgrade flow, paywall modals on locked features, and a stub upgrade CTA — is fully buildable with the existing stack. GlueStack UI + NativeWind already cover every required UI primitive: cards, modals, badges, gradients (via `expo-linear-gradient`, already installed), and the `expo-secure-store` persistence layer for plan state.

The research question was whether RevenueCat, Superwall, or any paywall-specific library should be added now to "lay the groundwork." The answer is no — and adding them would actively harm this milestone. Reasons are documented below.

---

## Recommended Additions

None. The stub-payment milestone requires no new npm packages.

### What Existing Stack Covers

| Feature Needed | Covered By | How |
|---------------|------------|-----|
| Pricing comparison screen | GlueStack `VStack` + `HStack` + `Pressable` + NativeWind | Compose a feature-comparison card layout with checkmarks (Lucide `Check`, already installed). No dedicated pricing component library exists with better output than handwritten GlueStack. |
| Paywall modal on locked feature tap | GlueStack `Modal` + `ModalBackdrop` + `ModalContent` | Already implemented in `modules-config.tsx` at line 368 — extend this pattern, do not replace it. |
| Upgrade banner on event screens | GlueStack `Box`/`VStack` + `expo-linear-gradient` | `expo-linear-gradient` is already installed. A gradient teal banner with upgrade CTA uses the same pattern as the existing `modules-config.tsx` free-tier banner. |
| "Contact us" / waitlist CTA | `expo-web-browser` (already installed) | `WebBrowser.openBrowserAsync(waitlistUrl)` opens a Typeform or similar in-app. No SDK needed. |
| Plan tier gating in UI | `event.planTier` from existing `TEvent` type | `planTier: 'free' | 'premium'` is already on `TEvent` (Phase 25). The gating logic (`isFree && isPremium`) already exists in `modules-config.tsx`. |
| Persisting "upgrade interest" locally | `expo-secure-store` (already installed) | Store `upgrade_interest_${eventId}: 'true'` to suppress repeat paywall prompts. Same SecureStore pattern as onboarding gating. |
| Per-event upgrade model | Backend column `events.plan_tier` (already exists) | No client SDK needed. The upgrade endpoint will be a simple `PATCH /api/events/:id { plan_tier: 'premium' }` stubbed to return 200. The client calls the existing events API. |
| Bottom-sheet paywall variant | `@gorhom/bottom-sheet` v5 (already installed) | Optional for a full-screen-style paywall anchored from the bottom. Already used in the app. |
| Haptic feedback on upgrade confirm | `expo-haptics` (already installed as of v2.2) | `Haptics.notificationAsync(NotificationFeedbackType.Success)` on the stub "Request Access" tap. |

---

## What NOT to Add (and Why)

### RevenueCat (`react-native-purchases` + `react-native-purchases-ui`)

**Do not add for this milestone.**

The core SDK (`react-native-purchases` v9.x) has landed new-architecture fixes. However, `react-native-purchases-ui` — the paywall component package — has multiple active issues against Expo Router's nested navigation and new architecture as of 2025:

- Android crash when launching paywall UI from nested routes (Expo Router 4+, Issue #1486 on RevenueCat GitHub)
- Paywall component freezes on iOS under certain rendering conditions (Issue #1360)
- `react-native-purchases-ui 9.5.4` EAS build failure due to mismatched `PurchasesHybridCommonUI` peer dependency (Issue #1450)
- PaywallView styling timing issues (draft fix as of late 2025, not yet released)

Gatherly has `newArchEnabled: true` in `app.json` and uses Expo Router 6 with nested routes throughout. Adding `react-native-purchases-ui` into this environment during a stub-payment milestone creates breakage with no benefit — there is no real billing to back it.

**When to add:** After Stripe backend integration is confirmed working and before App Store submission, add `react-native-purchases` (core SDK only, without the UI package) to manage entitlements. The custom pricing screens built in this milestone will feed directly into the RevenueCat purchase flow. Keep the UI custom.

**Confidence:** MEDIUM. Based on multiple GitHub issues from 2025. The `react-native-purchases` core SDK is more stable than the UI package — the recommendation to defer is specifically about the UI package, not the core SDK.

### Superwall (`expo-superwall`)

**Do not add.**

Superwall is a remote-config paywall service: paywalls are defined on Superwall's dashboard and served remotely. This is valuable when A/B testing paywall copy after launch, not during a stub milestone. Superwall also requires App Store / Play Store products to be live before it can render meaningful paywalls — it cannot operate in a pure stub mode.

The expo-superwall SDK supports Expo SDK 53+, so new-architecture compatibility is not the blocker. The blocker is product-market fit: Gatherly is building a per-event upgrade model, not a subscription-based paywall, and Superwall's remote config model optimises for subscription conversion funnels. The paywall UX here is simpler and more custom.

**When to evaluate:** Post-launch, if subscription conversion needs A/B testing and Gatherly has moved to a subscription model. Not before.

### Adapty

**Do not add.**

Same reasoning as Superwall — requires live store products, adds SDK weight, and the paywall UI library path will conflict with Gatherly's custom GlueStack UI system.

### `@stripe/stripe-react-native`

**Do not add for this milestone.**

The Stripe React Native SDK requires a native module rebuild (it is not a pure JS library). Adding it now, before the payment backend is built, adds bundle weight, an EAS build dependency, and a native module that will sit dormant. It also requires configuring `StripeProvider` at the root layout, which is an architectural change that should be done when billing is actually wired.

**When to add:** The billing milestone. The stub CTA in this milestone calls `expo-web-browser` to open a contact/waitlist URL — no Stripe SDK required.

### `react-native-iap`

**Do not add.** Same reasoning as Stripe — no live products, no store submission, no reason to add a native IAP module during a stub phase. As of 2025 `react-native-iap` also has unresolved new-architecture compatibility discussions (GitHub Discussion #2754).

---

## Integration Notes

### Upgrade Flow Architecture (Stub)

The per-event upgrade model is a backend concern (`events.plan_tier`). The client-side flow for the stub:

```
User taps locked feature
  → isPremium && isFree
    → show paywall modal (GlueStack Modal, existing pattern)
       → "Upgrade" CTA
          → stub: POST /api/events/:id/upgrade (returns 200, sets plan_tier='premium')
          OR
          → stub: WebBrowser.openBrowserAsync('https://your-waitlist-url')
```

The `POST /api/events/:id/upgrade` stub endpoint is a two-line Express route that sets `plan_tier = 'premium'` and returns the updated event. TanStack Query's `invalidateQueries` on the events key will re-fetch and update `planTier` in `TEvent`, automatically unlocking the UI. No new state management needed.

### Pricing Screen

Build as a standalone route (`/upgrade` or `/upgrade?eventId=xxx`) using:
- `ScrollView` wrapper with `SafeAreaView`
- GlueStack `VStack` + `HStack` for the two-column plan comparison layout (Free vs Premium)
- Lucide `Check` and `X` icons (already installed) for feature rows
- `expo-linear-gradient` for the premium card highlight (already installed)
- GlueStack `Button` for the upgrade CTA

No pricing card component library exists that produces better output than this composition. Third-party pricing card libraries for React Native are either unmaintained, subscription-model-specific, or impose styling that conflicts with Gatherly's teal/GlueStack design system.

### Paywall Modal vs Paywall Screen

Two surfaces need building:

1. **Inline paywall modal** (triggered from `modules-config.tsx` and from inside module screens) — already stubbed in `modules-config.tsx`. Needs to be promoted to a reusable component so all module screens share it without duplicating the modal JSX.

2. **Full pricing/plans screen** (reachable from the upgrade banner and from "Learn more" links) — a dedicated route. Provides the feature comparison table and the upgrade CTA.

The existing GlueStack `Modal` in `modules-config.tsx` becomes the reusable `UpgradeModal` component. The full pricing screen is a new route. No library needed for either.

### plan_tier State Flow

`planTier` lives on `TEvent` (already present). After a stub upgrade:
1. Call `PATCH /api/events/:id` or stub `POST /api/events/:id/upgrade`
2. TanStack Query invalidates `['events']` — events list re-fetches
3. `event.planTier` flips to `'premium'`
4. All paywall gates re-evaluate via `isFree = event.planTier === 'free'`
5. No client-side state duplication needed

---

## What to Defer to the Billing Milestone

| Item | Why Deferred | When to Add |
|------|-------------|-------------|
| `react-native-purchases` (RevenueCat core) | No live App Store / Play Store products yet; core SDK is stable but pointless without products | When submitting to app stores with live billing |
| `@stripe/stripe-react-native` | Requires native rebuild, root StripeProvider, and a working billing backend | The billing milestone, after `POST /api/events/:id/upgrade` is wired to Stripe |
| RevenueCat entitlement checks | Requires RevenueCat project setup, API keys, and product configuration | Same as react-native-purchases |
| `expo-superwall` | Requires live products and is optimised for subscription funnels, not per-event purchases | Evaluate post-launch if A/B testing paywall copy is needed |
| `react-native-purchases-ui` paywall component | Active crash issues with Expo Router 6 nested routes + new architecture | Re-evaluate when RevenueCat releases a confirmed fix; use custom GlueStack screens instead |
| App Store purchase flow (`StoreKit` / `Google Play Billing`) | Requires app store product registration | When submitting to stores |
| Server-side webhook verification (Stripe) | Requires Stripe account setup | Billing milestone |

---

## Version Compatibility Matrix

No new packages to install. For reference, existing packages used in paywall UX:

| Package | Installed Version | New Arch (Fabric) | Notes |
|---------|-------------------|-------------------|-------|
| `@gluestack-ui/core` | 3.0.12 | Yes | Modal, Button, Pressable, Switch all used in existing paywall stub |
| `expo-linear-gradient` | ~55.0.9 | Yes — first-party Expo | For premium card highlight on pricing screen |
| `expo-web-browser` | ~15.0.7 | Yes — first-party Expo | For stub "Contact us" / waitlist CTA |
| `expo-secure-store` | ~15.0.8 | Yes — first-party Expo | For persisting "upgrade interest" flag per event |
| `expo-haptics` | ~15.0.8 | Yes — first-party Expo | Success haptic on stub upgrade confirm |
| `@gorhom/bottom-sheet` | 5.0.0-alpha.11 | Yes — explicitly new-arch | Optional bottom-sheet paywall variant |
| `lucide-react-native` | 0.510.0 | Yes — pure JS | Check/X icons for feature comparison rows |

All packages confirmed installed in `apps/gatherly-mobile/package.json` (verified 2026-03-27).

---

## Sources

- `apps/gatherly-mobile/package.json` — confirmed installed packages and versions (verified in-repo)
- `apps/gatherly-mobile/app.json` — confirmed `newArchEnabled: true` (drives all new-arch compatibility checks)
- `apps/gatherly-mobile/app/modules-config.tsx` — existing paywall modal stub (lines 368–422); existing upgrade banner (lines 221–240); existing `isFree` gating pattern (line 126)
- RevenueCat GitHub Issues: [#1486 (Android crash, nested routes)](https://github.com/revenuecat/react-native-purchases/issues/1486), [#1360 (PaywallView freeze iOS)](https://github.com/revenuecat/react-native-purchases/issues/1360), [#1450 (EAS build failure)](https://github.com/revenuecat/react-native-purchases/issues/1450) — active issues confirming `react-native-purchases-ui` instability in 2025
- [RevenueCat Expo installation docs](https://www.revenuecat.com/docs/getting-started/installation/expo) — confirmed Expo support exists for core SDK, but UI package issues separate
- [expo-superwall GitHub](https://github.com/superwall/expo-superwall) — confirmed SDK 53+ support, new-arch compatible, but product-requirement blocker applies
- [react-native-iap New Architecture Discussion #2754](https://github.com/hyochan/react-native-iap/discussions/2754) — unresolved new-arch compatibility
- WebSearch: RevenueCat new-arch crash reports (February–November 2025), Superwall Expo SDK 53+ compatibility

---

*Stack research for: Gatherly Mobile — Paywall UX Milestone (Stub Payment)*
*Researched: 2026-03-27*
*Confidence: HIGH for "add nothing" recommendation (all existing packages verified in-repo, no-new-package conclusion supported by issue evidence). MEDIUM for RevenueCat new-arch status (based on GitHub issues, not official docs statement).*
