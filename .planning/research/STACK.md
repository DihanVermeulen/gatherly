# Technology Stack — v2.2 UI Rehaul

**Project:** Gatherly Mobile (apps/gatherly-mobile)
**Milestone:** v2.2 — Potluck Module, Welcoming Onboarding, Event Cover Photo, UI Rehaul
**Researched:** 2026-03-17
**Scope:** NEW additions only. Existing stack (Expo 54, GlueStack UI, NativeWind, Expo Router, TanStack Query v5, expo-sqlite, expo-image-picker, Lucide React Native, react-native-reanimated 4.1.6, react-native-gesture-handler 2.30.0) is validated and unchanged.

## Summary of New Additions Required

| Feature | Library Needed | Why Not Covered by Existing Stack |
|---------|---------------|----------------------------------|
| Getting Started swipeable splash with dot indicators | `react-native-pager-view` | No paging primitive in existing stack; ScrollView with `pagingEnabled` is insufficient on Android |
| Welcoming onboarding route gating (shown once) | `expo-secure-store` (already installed) | Already available — use `SecureStore.setItemAsync('onboarding_complete', 'true')` |
| Potluck food images from external URLs with caching | `expo-image` | React Native's built-in `Image` has no disk cache; external food photo URLs will re-fetch on every render |
| Event cover photo — pick from library / camera | `expo-image-picker` (already installed) | Already used in `edit-wishlist-item.tsx` with identical pattern |
| Interest tag multi-select UI (Preferences screen) | No new library — compose with GlueStack `Pressable` + `Badge` | GlueStack components already support toggled chip patterns |
| Multi-step progress bar (Profile Setup screen) | No new library — GlueStack `Progress` + `ProgressFilledTrack` | Already in `components/ui/progress/` |
| Haptic feedback on tag selection / onboarding buttons | `expo-haptics` | Not installed; enhances perceived responsiveness for toggle interactions |

**Net new installs: 3 packages** (`react-native-pager-view`, `expo-image`, `expo-haptics`)

---

## Required Additions

### 1. react-native-pager-view

**Purpose:** Native swipeable pager for the Getting Started splash screens (3-page intro with dot indicators).

**Version:** `6.9.1` — this is the exact version bundled in Expo SDK 54's `bundledNativeModules.json`. Do not deviate.

**Why this and not alternatives:**

- **React Native `ScrollView` with `pagingEnabled`** — works but has known Android jank when transitioning pages; dot indicator sync requires manual scroll-position tracking via `onScroll`, which is fragile.
- **`react-native-snap-carousel`** — unmaintained since 2023. The v4 branch that supports React Native's new architecture is stalled.
- **Custom `Animated` + `FlatList` with `pagingEnabled`** — viable but adds 100+ lines of boilerplate for a one-time flow. PagerView is simpler and native.
- **`react-native-pager-view`** — backed by native `ViewPager2` on Android and `UIPageViewController` on iOS. Zero-jank native page transitions. Supported by the Expo team and listed as a bundled native module.

**Usage pattern for Getting Started:**

```typescript
import PagerView from 'react-native-pager-view';

// PagerView exposes onPageSelected for dot indicator sync
<PagerView style={{ flex: 1 }} initialPage={0} onPageSelected={e => setPage(e.nativeEvent.position)}>
  <SplashPage1 key="1" />
  <SplashPage2 key="2" />
  <SplashPage3 key="3" />
</PagerView>

// Dot indicators — render 3 View circles, tint active one with teal-500
```

**Note on dot indicators:** Implement as plain `View` circles (no additional library). Three dots with `backgroundColor: page === i ? '#0d9488' : '#d1d5db'` matches the design template exactly. No extra dependency needed.

**Installation:**
```bash
cd apps/gatherly-mobile
npx expo install react-native-pager-view
```
`npx expo install` resolves to the SDK-compatible version automatically.

---

### 2. expo-image

**Purpose:** Display external food photo URLs in the Potluck Setup and Signup screens with automatic disk caching.

**Version:** `~3.0.11` — Expo SDK 54 bundled version.

**Why this and not alternatives:**

- **React Native's built-in `Image`** — no disk cache layer; every app restart re-fetches external URLs. The Potluck Setup screen shows food category images (external URLs) in a scroll list — without caching, scrolling causes repeated network fetches and visual flicker.
- **`expo-image`** — uses SDWebImage (iOS) and Glide (Android) under the hood: the same battle-tested caching libraries used by major apps. Supports `contentFit`, `transition` animations, blurhash placeholders, and an explicit `cachePolicy` prop. It is already a first-party Expo package.
- **`react-native-fast-image`** — the historical alternative, but it does not support the new React Native architecture (Fabric/JSI). Gatherly has `newArchEnabled: true` in `app.json`. react-native-fast-image will break.

**Where to use:**
- Potluck category images on Setup screen (external URL, needs caching)
- Potluck item image on Signup detail screen (full-width hero image, needs transition animation)
- Event cover photo display in Details screen (base64 OR remote URL depending on backend implementation)

**Where NOT to use (keep existing RN `Image`):**
- Wishlist item images — currently base64, no caching benefit
- Avatar/participant thumbnails — already handled by GlueStack `Avatar`

**Key API differences from RN Image:**
```typescript
// React Native Image
<Image source={{ uri: imageUrl }} style={{ width: 80, height: 80 }} />

// expo-image (preferred for remote URLs)
import { Image } from 'expo-image';
<Image
  source={imageUrl}
  style={{ width: 80, height: 80 }}
  contentFit="cover"
  transition={200}
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
  cachePolicy="memory-disk"
/>
```

**Installation:**
```bash
cd apps/gatherly-mobile
npx expo install expo-image
```

---

### 3. expo-haptics

**Purpose:** Tactile feedback when selecting/deselecting interest tags on the Preferences screen and confirming potluck item signup.

**Version:** `~15.0.8` — Expo SDK 54 bundled version.

**Why add this:**
The Preferences screen has a toggle-chip interaction (select/deselect interests). Without haptics this feels flat on physical devices. The design template shows selected tags with a filled teal background — a subtle `ImpactFeedbackStyle.Light` on toggle matches the visual weight of the interaction.

**Why not skip it:**
This is a light-touch addition (one import, one line per interaction). Skipping it makes onboarding feel less polished on the primary target platform (iOS).

**Usage pattern:**
```typescript
import * as Haptics from 'expo-haptics';

// On interest tag toggle
const toggleTag = (tag: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
};

// On Potluck item signup confirm
const handleConfirm = async () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await potluckApi.signup(eventId, itemId, note);
};
```

**Android note:** `expo-haptics` falls back to `Vibrator.vibrate()` on Android. The experience is slightly heavier than iOS but still acceptable.

**Installation:**
```bash
cd apps/gatherly-mobile
npx expo install expo-haptics
```

---

## Already-Installed Libraries Covering New Features

These features require NO new packages — existing stack is sufficient.

### Event Cover Photo (pick and upload)

`expo-image-picker` is already installed at v55.0.10 and already used in `edit-wishlist-item.tsx`. The cover photo picker uses an identical pattern:

```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [16, 9],   // landscape for event banner
  quality: 0.7,
  base64: true,
});
```

The backend already stores `image_url` as base64 (established pattern from wishlists). No new library or upload service needed. Cover photo follows the same base64-in-JSON pattern.

**Camera option** (for taking a new cover photo): `ImagePicker.launchCameraAsync()` is available in the same package. Add `requestCameraPermissionsAsync()` before calling it.

### Welcoming Onboarding — Show Once Gating

`expo-secure-store` is already installed. Track onboarding completion with a persisted flag:

```typescript
// Check on app init (in AuthContext or _layout.tsx)
const hasSeenOnboarding = await SecureStore.getItemAsync('onboarding_complete');
if (!hasSeenOnboarding) {
  router.replace('/onboarding/getting-started');
}

// Set when onboarding finishes
await SecureStore.setItemAsync('onboarding_complete', 'true');
```

No AsyncStorage or additional persistence library needed. `expo-secure-store` is already the app's persistence layer for auth.

### Interest Tag Multi-Select (Preferences Screen)

GlueStack `Pressable` + `Badge` (or `Box`) compose into toggle chips. The design shows outline chips → filled teal on selection. Implement as controlled state with `useState<string[]>`:

```typescript
<Pressable
  onPress={() => toggleTag(tag)}
  className={`px-4 py-2 rounded-full border ${
    selected.includes(tag)
      ? 'bg-teal-600 border-teal-600'
      : 'border-gray-300'
  }`}
>
  <Text className={selected.includes(tag) ? 'text-white' : 'text-gray-700'}>
    {tag}
  </Text>
</Pressable>
```

No chip/tag library needed. GlueStack `Pressable` + NativeWind classes handle this exactly.

### Multi-Step Progress Bar (Profile Setup Screen)

GlueStack `Progress` + `ProgressFilledTrack` already exist in `components/ui/progress/`. The Profile Setup screen ("Step 1 of 3" with teal progress bar) maps directly to `value={(currentStep / totalSteps) * 100}`.

### Potluck Quantity Stepper (+/-)

The Setup screen has a `−  4  +` stepper per category. This is a simple `useState<number>` with two `Pressable` buttons and a `Text`. No stepper library needed.

### SectionList for Potluck Categories

The Potluck List screen shows items grouped by category (APPETIZERS, MAIN COURSE, DRINKS). React Native's built-in `SectionList` already used in `view-wishlists.tsx` — same pattern applies here.

---

## What NOT to Add

| Avoid | Why | Alternative |
|-------|-----|-------------|
| `react-native-snap-carousel` | Unmaintained since 2023, stalled new-arch support | `react-native-pager-view` |
| `react-native-fast-image` | Does not support new React Native architecture; `newArchEnabled: true` in app.json will break it | `expo-image` |
| `@react-native-community/viewpager` | The deprecated predecessor to `react-native-pager-view`; same Expo SDK entry points to pager-view | `react-native-pager-view` |
| `react-native-onboarding-swiper` | Opinionated styling conflicts with existing GlueStack/NativeWind system; adds bundle weight for zero capability gain over PagerView | `react-native-pager-view` + custom dots |
| `@react-native-async-storage/async-storage` | Expo SDK 54 includes it as bundled module, but `expo-secure-store` already handles all persistence needs in this app | `expo-secure-store` (already installed) |
| Any food image search API SDK (Unsplash, Pexels) | Potluck category images stored as URL strings in the backend DB; the mobile client only needs to display them, not search for them | `expo-image` for display |
| `lottie-react-native` | Onboarding animations from the templates are static illustrations, not Lottie animations | Static SVG/PNG assets |

---

## Installation Summary

```bash
cd apps/gatherly-mobile

# All three use npx expo install to ensure SDK-compatible versions
npx expo install react-native-pager-view
npx expo install expo-image
npx expo install expo-haptics
```

**No backend (apps/api) package changes required for v2.2 stack.** The Potluck data model uses new PostgreSQL tables and routes (covered in ARCHITECTURE.md), but no new npm packages on the API side.

---

## Backend: New Schema Only (No New Packages)

The existing backend stack (`express`, `pg`, `jsonwebtoken`, `nodemailer`) covers all v2.2 API needs. The Potluck module requires:

- New PostgreSQL tables: `potluck_categories`, `potluck_items`, `potluck_signups`
- New routes added to `apps/api/src/routes/modules.ts` (already exists)
- New columns on `events`: `location`, `cover_photo_url`, `allow_guest_invites`, `is_public`
- New column on `users`: `interests` (TEXT[] or JSONB), `bio`, `avatar_url`

These are schema and route additions — no new npm dependencies.

---

## Version Compatibility Matrix

| New Package | Version | Expo SDK 54 Compatible | New Arch (Fabric) Compatible | Notes |
|-------------|---------|----------------------|------------------------------|-------|
| react-native-pager-view | 6.9.1 | Yes — listed in bundledNativeModules.json | Yes | Use `npx expo install` to get exact version |
| expo-image | ~3.0.11 | Yes — listed in bundledNativeModules.json | Yes — first-party Expo | Ships with SDWebImage/Glide native modules |
| expo-haptics | ~15.0.8 | Yes — listed in bundledNativeModules.json | Yes — first-party Expo | Android falls back to Vibrator |

All three packages are listed in Expo SDK 54's `bundledNativeModules.json` (verified in `node_modules/expo/bundledNativeModules.json`). They are guaranteed compatible with `expo` 54.0.33 and `react-native` 0.81.5.

---

## Sources

- `apps/gatherly-mobile/node_modules/expo/bundledNativeModules.json` — authoritative version constraints for Expo SDK 54 (verified in-repo)
- `apps/gatherly-mobile/package.json` — confirmed existing installed packages (expo-image-picker 55.0.10, react-native-reanimated 4.1.6, react-native-gesture-handler 2.30.0)
- `apps/gatherly-mobile/app.json` — confirmed `newArchEnabled: true` (drives react-native-fast-image exclusion)
- `apps/gatherly-mobile/app/edit-wishlist-item.tsx` — confirmed expo-image-picker pattern already in use (base64 storage, library picker)
- `apps/gatherly-mobile/components/ui/progress/index.tsx` — confirmed Progress component available
- `apps/gatherly-mobile/screen-templates/Welcoming/*.png` — Getting-Started (dot pager), Preferences (chip selection), Profile-Setup (progress bar + image picker)
- `apps/gatherly-mobile/screen-templates/Potluck/*.png` — List (SectionList pattern), Setup (category + food image), Signup (hero image + form)

---

*Stack research for: Gatherly Mobile v2.2 — Potluck Module, Welcoming Onboarding, Event Cover Photo*
*Researched: 2026-03-17*
*Confidence: HIGH — all versions verified against in-repo bundledNativeModules.json and existing package.json*
