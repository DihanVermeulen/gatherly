# Phase 31: Onboarding Screens - Research

**Researched:** 2026-03-19
**Domain:** Expo Router 6 / React Native navigation guards, animated carousel, preferences flow, onboarding-complete server flag
**Confidence:** HIGH

## Summary

Phase 31 builds a first-run onboarding experience for Gatherly Mobile. It has two distinct parts: a pre-auth splash carousel (shown to unauthenticated users before sign-in/register) and a post-registration flow (profile setup + preferences), gated by the server-side `onboarding_complete` flag already in the DB from Phase 30. Magic-link participant sessions (`user.participantId !== undefined`) must never see onboarding.

The standard stack is entirely in-project: Expo Router 6's `Stack.Protected` for navigation guards, React Native's `FlatList` with `pagingEnabled` and `scrollEventThrottle` for the splash carousel, GlueStack UI components throughout (Button, Input, Pressable, Progress, Text, Heading, VStack, HStack), `expo-haptics` (needs install) for toggle feedback, and `usersApi` (needs type update) for writing the completion flag.

Screen templates for all three new screens already exist in `apps/gatherly-mobile/screen-templates/Welcoming/`. The backend API (`PUT /api/users/me` with `onboardingComplete: true`) already works.

**Primary recommendation:** Add two `Stack.Protected` blocks in `_layout.tsx` — one for the pre-auth splash (`welcome`) and one for the post-auth onboarding flow — rather than embedding navigation logic inside individual screens. Gate the post-auth block on `!!session && !user.onboardingComplete && !user.participantId`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | 6.0.23 (installed) | File-based routing + `Stack.Protected` guards | Already used for all auth guards in `_layout.tsx` |
| react-native `FlatList` | bundled with RN 0.81.5 | Paginated horizontal carousel with snap | Built-in, `pagingEnabled` gives free snap behavior; no extra dep |
| react-native-reanimated | 4.1.6 (installed) | Animated dot indicator transitions | Already installed, used elsewhere in project |
| GlueStack UI | @gluestack-ui/core 3.0.12 | All UI primitives | Project standard — never use custom UI primitives |
| expo-haptics | NOT installed (needs `npm install --ignore-scripts expo-haptics`) | Haptic feedback on preference toggles | Requirement ONBOARD-02; standard Expo managed workflow library |
| expo-secure-store | 15.0.8 (installed) | Cache onboarding flag locally to avoid extra API call | Already used for token persistence |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react-native | 0.510.0 (installed) | Icons on preference chips and CTA buttons | Already used project-wide |
| expo-image-picker | 55.0.9 (installed) | Avatar upload in Profile Setup screen | Already installed; use for avatar selection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FlatList pagingEnabled | react-native-snap-carousel or Reanimated Carousel | FlatList is built-in, has zero install risk, and is sufficient for a 3-slide static carousel. Third-party carousels add complexity without benefit here. |
| expo-haptics | Vibration API | `expo-haptics` gives finer-grained feedback types (selection, impact, notification). Vibration API is cruder. |

**Installation (only new dependency):**
```bash
# Must use --ignore-scripts due to pnpm virtual store length mismatch (project rule)
npm install --ignore-scripts expo-haptics
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── welcome.tsx               # Splash carousel (pre-auth, 3 slides, dot indicators)
├── onboarding/
│   ├── profile-setup.tsx     # Step 1 of 2: name, bio, avatar, gift prefs
│   └── preferences.tsx       # Step 2 of 2: 13 interest categories
├── _layout.tsx               # MODIFIED: add two new Stack.Protected blocks
└── contexts/
    └── AuthContext.tsx       # MODIFIED: User type gets onboardingComplete field
app/api/
└── users.ts                  # MODIFIED: UserProfile type gets new Phase 30 fields
```

### Pattern 1: Stack.Protected Navigation Guard (pre-auth splash)

**What:** A `Stack.Protected` block with `guard={!session}` wraps both `sign-in`, `register`, AND the new `welcome` screen. This means unauthenticated users can reach all three; authenticated users are redirected away.

**When to use:** When a screen should only be visible when no session exists.

```typescript
// Source: _layout.tsx existing pattern
<Stack.Protected guard={!session}>
  <Stack.Screen name="welcome" options={{ headerShown: false }} />
  <Stack.Screen name="sign-in" options={{ headerShown: false }} />
  <Stack.Screen name="register" options={{ headerShown: false }} />
</Stack.Protected>
```

**Important:** The `welcome` screen is the *default* unauthenticated screen. When there is no session and the user opens the app, Expo Router falls through to the first unprotected/protected match. The existing `sign-in` screen is currently the implicit default. After this phase, `welcome` must be the first `Stack.Screen` inside the unauthenticated `Stack.Protected` block so it becomes the landing screen.

### Pattern 2: Stack.Protected for Post-Auth Onboarding

**What:** After registration, a user has a session but `onboarding_complete = false`. A second `Stack.Protected` block intercepts these users and routes them to the onboarding flow before the main tabs.

**When to use:** Blocking post-registration users from the main app until onboarding is done or skipped.

```typescript
// Guard: session exists AND NOT a participant AND NOT onboarding complete
<Stack.Protected guard={!!session && !user?.participantId && !user?.onboardingComplete}>
  <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false }} />
  <Stack.Screen name="onboarding/preferences" options={{ headerShown: false }} />
</Stack.Protected>
```

**Critical:** `user` here comes from `useSession()`. The `User` type in `AuthContext.tsx` does NOT currently include `onboardingComplete`. It must be added (see Architecture change below).

### Pattern 3: onboardingComplete in AuthContext + UserProfile

**What:** The `User` interface in `app/api/auth.ts` and `UserProfile` in `app/api/users.ts` are both missing the Phase 30 fields. These must be updated before the guard can function.

Changes required:
1. `app/api/auth.ts` — add `onboardingComplete?: boolean` to `User` interface
2. `app/api/users.ts` — add `bio`, `interests`, `avatarUrl`, `onboardingComplete` to `UserProfile` interface; update `getMe` return type; update `updateMe` to accept full profile patch shape
3. `app/contexts/AuthContext.tsx` — update `signIn` to store and expose `onboardingComplete` from the JWT payload (or fetch from `/api/users/me` post-login)

**Note:** The backend already returns `onboardingComplete` from `GET /api/users/me`. The registration endpoint (`POST /api/auth/register`) will return `onboardingComplete: false` for new users. The mobile must plumb this through.

### Pattern 4: FlatList Carousel with Dot Indicators

**What:** A horizontal `FlatList` with `pagingEnabled` and `onScroll` tracking renders the 3 splash slides. Dot indicators are rendered separately based on the active slide index.

```typescript
// Source: React Native official docs (FlatList pagingEnabled)
const [activeIndex, setActiveIndex] = useState(0);

<FlatList
  data={SLIDES}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  scrollEventThrottle={16}
  onScroll={(e) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
    );
    setActiveIndex(index);
  }}
  renderItem={({ item }) => <SlideItem slide={item} />}
  keyExtractor={(item) => item.id}
/>

{/* Dot indicators */}
<HStack className="gap-2 justify-center mt-4">
  {SLIDES.map((_, i) => (
    <View
      key={i}
      className={`h-2 rounded-full ${i === activeIndex ? 'w-6 bg-primary-500' : 'w-2 bg-background-300'}`}
    />
  ))}
</HStack>
```

### Pattern 5: Preference Toggle with Haptic Feedback

**What:** Each interest category renders as a tappable chip (Pressable + Text). When selected, it fires `Haptics.selectionAsync()`. State tracks selected items; minimum 3 must be selected before "Start Exploring" becomes active.

```typescript
// Source: expo-haptics official docs
import * as Haptics from 'expo-haptics';

const toggleInterest = async (category: string) => {
  if (selected.includes(category)) {
    setSelected(prev => prev.filter(c => c !== category));
  } else {
    setSelected(prev => [...prev, category]);
  }
  await Haptics.selectionAsync(); // haptic on every toggle
};
```

### Pattern 6: Completing Onboarding (one-way flag)

**What:** After the preferences screen, call `PUT /api/users/me` with `{ onboardingComplete: true }`. The backend silently ignores `false` — this is a one-way flag. Then update the local `user` in AuthContext.

```typescript
// Pattern for onboarding completion
const completeOnboarding = async () => {
  await usersApi.updateMe({ onboardingComplete: true, interests: selected });
  // Update local user state so the Stack.Protected guard re-evaluates
  // AuthContext must expose an updateUser() method or re-call signIn() with updated user
};
```

**Important:** The `Stack.Protected` guard reacts to `user.onboardingComplete`. After calling `updateMe`, the local `user` object in AuthContext must be updated. The cleanest approach is to add an `updateUser(patch: Partial<User>)` function to AuthContext that merges into the existing user state and persists to SecureStore.

### Anti-Patterns to Avoid

- **Checking `onboarding_complete` only in SecureStore:** SecureStore is a local cache, not the source of truth. On first launch after reinstall, SecureStore is empty and the server flag correctly re-triggers onboarding. Don't skip the server check on the session restore path.
- **Using `router.replace` inside onboarding screens to self-navigate:** The guard in `_layout.tsx` handles routing. Individual screens should just call completion callbacks; the guard reacts and auto-redirects.
- **Showing onboarding on re-login:** After the user completes onboarding, `onboarding_complete = true` in the DB. On next login, `GET /api/users/me` returns `onboardingComplete: true`. The `Stack.Protected` guard won't fire. This works correctly IF the user object is populated from the refresh call.
- **Triggering onboarding for magic-link participants:** Always check `user.participantId === undefined` before the guard fires. Magic-link sessions never have `onboardingComplete` in their JWT and should never see onboarding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Carousel | Custom scroll with Animated + PanResponder | `FlatList` with `pagingEnabled` | FlatList handles momentum scrolling, overscan, recycling, and keyboard avoidance for free |
| Haptic feedback | Platform-specific Vibration API calls | `expo-haptics` | Managed Expo workflow; consistent API across iOS/Android; already a peer dep of Expo SDK 54 |
| Onboarding "shown once" persistence | AsyncStorage flag | Server-side `onboarding_complete` + SecureStore cache | SecureStore is wiped on reinstall — server flag is the only durable source of truth (per design decision) |
| Interest search | Custom fuzzy search | Simple `.filter(c => c.toLowerCase().includes(query))` | Only 13 categories; regex or fuzzy lib is overkill |

**Key insight:** The entire routing/guard logic lives in `_layout.tsx` using `Stack.Protected`. Individual screens don't need to know about routing — they just complete their flow and update state.

## Common Pitfalls

### Pitfall 1: User Type Missing onboardingComplete Causes Guard Never Firing

**What goes wrong:** If `User` in `auth.ts` doesn't include `onboardingComplete`, then `user?.onboardingComplete` is always `undefined` (falsy), so the post-auth `Stack.Protected` guard `!!session && !user?.participantId && !user?.onboardingComplete` always evaluates to `true` — meaning the onboarding screens are shown on every login.

**Why it happens:** The `User` type was defined in Phase 12 before `onboarding_complete` existed in the DB. The backend register/refresh responses don't return this field in the current codebase (need to verify and add to API response).

**How to avoid:** Update the backend `/api/auth/register` and `/api/auth/refresh` responses to include `onboardingComplete` in the user object. Update `User` interface. Update `SessionProvider` to store and restore this field.

**Warning signs:** Onboarding screens appear on every login even after completion.

### Pitfall 2: Race Between Stack.Protected Redirect and Pending Magic Token

**What goes wrong:** `_layout.tsx` already has a `useEffect` that handles pending magic tokens/invite codes post-authentication. If the new onboarding `Stack.Protected` fires first and redirects to `onboarding/profile-setup`, the magic token redirect may be consumed but fail to navigate correctly.

**Why it happens:** Multiple `useEffect` hooks in `RootLayoutNav` run concurrently. The order of `Stack.Protected` evaluation vs. `useEffect` redirect is non-deterministic.

**How to avoid:** The onboarding guard must check for pending magic tokens and suppress the onboarding redirect if one is pending. Alternatively, magic-link participants always have `user.participantId` set, so the guard already excludes them. Verify: after magic-link redemption where the user has `id` (account-linked), `onboardingComplete` must be populated correctly.

**Warning signs:** Deep-link navigation fails for users who registered but haven't completed onboarding.

### Pitfall 3: Carousel Width Issues on Different Screen Sizes

**What goes wrong:** FlatList with `pagingEnabled` snaps to `width` of its container. If width is not exactly the screen width, slides are partially visible.

**Why it happens:** FlatList doesn't know its parent's width unless explicitly set.

**How to avoid:** Use `Dimensions.get('window').width` or the `onLayout` callback to set `renderItem` width explicitly. Pass `getItemLayout` for performance.

```typescript
// Source: React Native FlatList docs
const { width } = Dimensions.get('window');

renderItem={({ item }) => (
  <View style={{ width }}>
    {/* slide content */}
  </View>
)}
getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
```

**Warning signs:** Carousel shows half the next slide. Snapping skips slides.

### Pitfall 4: Onboarding Shown After Skip but Not After Complete

**What goes wrong:** "Skip" on preferences screen should still mark onboarding as complete. If skip just `router.replace('/(tabs)')` without calling `PUT /api/users/me`, then the user sees onboarding on every login.

**Why it happens:** Skip is mistaken for "defer" when the spec says it triggers completion.

**How to avoid:** Both "complete" (after selecting interests) and "skip" buttons on all onboarding screens must call `PUT /api/users/me` with `{ onboardingComplete: true }` before navigating away.

**Warning signs:** User who presses Skip sees onboarding again on next login.

### Pitfall 5: usersApi.updateMe Signature Too Narrow

**What goes wrong:** The current `usersApi.updateMe(name: string)` only accepts a name string. The onboarding flow needs to patch `bio`, `interests`, `avatarUrl`, and `onboardingComplete` independently.

**Why it happens:** `updateMe` was implemented before Phase 30 extended the user profile.

**How to avoid:** Refactor `updateMe` to accept a partial patch object matching the backend's dynamic-patch contract:

```typescript
// Updated signature for users.ts
updateMe: async (patch: {
  name?: string;
  bio?: string | null;
  interests?: string[];
  avatarUrl?: string | null;
  onboardingComplete?: true; // only true accepted; false silently ignored
}): Promise<UserProfile>
```

**Warning signs:** TypeScript errors when passing interests/bio to updateMe. Onboarding data not saved.

## Code Examples

### Slide Data Structure for Welcome Carousel

```typescript
// Source: React Native FlatList patterns
const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Gatherly',
    subtitle: 'Simplified gift exchanges for every occasion.',
    body: 'Organize Secret Santas, birthdays, and group events without the stress.',
  },
  {
    id: '2',
    title: 'Connect with Friends',
    subtitle: 'Keep everyone on the same page.',
    body: 'Share wishlists, coordinate gifts, and make every celebration special.',
  },
  {
    id: '3',
    title: 'Start Your First Event',
    subtitle: 'It only takes a minute.',
    body: 'Create an event, invite your people, and let Gatherly handle the rest.',
  },
] as const;
```

### Interest Categories (ONBOARD-02 — 13 categories from screen template)

```typescript
// Source: screen-templates/Welcoming/Preferences.png (verified visually)
const INTEREST_CATEGORIES = [
  { id: 'music', label: 'Music & Concerts', icon: '🎵' },
  { id: 'tech', label: 'Tech & AI', icon: '💻' },
  { id: 'social', label: 'Social Mixers', icon: '👥' },
  { id: 'art', label: 'Art & Gallery', icon: '🎨' },
  { id: 'health', label: 'Health & Wellness', icon: '🌿' },
  { id: 'food', label: 'Food & Drink', icon: '🍽️' },
  { id: 'business', label: 'Business & Networking', icon: '💼' },
  { id: 'sports', label: 'Sports & Fitness', icon: '🏃' },
  { id: 'cinema', label: 'Cinema & Film', icon: '🎬' },
  { id: 'outdoor', label: 'Outdoor & Nature', icon: '🌲' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'parties', label: 'Parties', icon: '🎉' },
  { id: 'charity', label: 'Charity', icon: '🤝' },
  { id: 'literature', label: 'Literature', icon: '📚' },
] as const;
// Note: Screen shows 13 categories but list above has 14 — verify exact count from template
// Template shows: Music & Concerts, Tech & AI, Social Mixers, Art & Gallery, Health & Wellness,
// Food & Drink, Business & Networking, Sports & Fitness, Cinema & Film, Outdoor & Nature,
// Science, Parties, Charity, Literature
```

### AuthContext updateUser Helper

```typescript
// Pattern to add to AuthContext.tsx
const updateUser = async (patch: Partial<User>): Promise<void> => {
  const updated = user ? { ...user, ...patch } : null;
  if (updated) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  }
};
// Expose via context value
```

### Guard in _layout.tsx (post-auth onboarding)

```typescript
// In RootLayoutNav — add after the existing authenticated Stack.Protected block
// Onboarding guard: full-account users who haven't completed onboarding
<Stack.Protected guard={!!session && user?.participantId === undefined && !user?.onboardingComplete}>
  <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false }} />
  <Stack.Screen name="onboarding/preferences" options={{ headerShown: false }} />
</Stack.Protected>
```

### Completing Onboarding (preferences.tsx)

```typescript
// In onboarding/preferences.tsx
const handleComplete = async () => {
  setLoading(true);
  try {
    await usersApi.updateMe({ interests: selected, onboardingComplete: true });
    await updateUser({ onboardingComplete: true }); // update AuthContext
  } catch (err) {
    // Non-fatal: still navigate away; user can update interests later
    await updateUser({ onboardingComplete: true });
  } finally {
    setLoading(false);
    // Stack.Protected guard re-evaluates — navigation happens automatically
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage onboarding flag | Server-side `onboarding_complete` DB flag | Phase 30 (just completed) | Survives reinstall; not user-defeatable locally |
| React Navigation custom stacks | Expo Router `Stack.Protected` guards | Phase 27+ | Navigation guards live in `_layout.tsx`, not screens |
| Custom UI primitives | GlueStack UI components | Phase 12 | Never build custom UI primitives |

## Open Questions

1. **Does `/api/auth/register` return `onboardingComplete`?**
   - What we know: `GET /api/users/me` returns `onboardingComplete`. The mobile `User` type doesn't have it.
   - What's unclear: Whether the register/login/refresh responses include this field. If they don't, the guard can't work without an extra API call on every app open.
   - Recommendation: Verify the auth routes in `apps/api/src/routes/auth.ts`. If `onboardingComplete` is not in register/login/refresh responses, add it. This is a backend change required before the navigation guard works.

2. **SecureStore cache key for onboardingComplete**
   - What we know: `USER_KEY` stores the full user JSON in SecureStore. If we add `onboardingComplete` to the `User` type, it will be cached automatically when `signIn()` is called.
   - What's unclear: Whether the session restore path (via `authApi.refresh()`) returns the full user with `onboardingComplete`. If not, the guard evaluates on stale cached data until the next login.
   - Recommendation: After the silent refresh in `SessionProvider`, always re-read `onboardingComplete` from the response. Ensure the refresh API returns it.

3. **Exact count of interest categories**
   - What we know: Screen template shows 13-14 categories. The requirement says "13 interest categories."
   - What's unclear: The exact list. Preferences.png shows 14 items visually: Music & Concerts, Tech & AI, Social Mixers, Art & Gallery, Health & Wellness, Food & Drink, Business & Networking, Sports & Fitness, Cinema & Film, Outdoor & Nature, Science, Parties, Charity, Literature.
   - Recommendation: Treat the screen template as the authoritative list; count from the image = 14 items. The "13" in ONBOARD-02 may be a spec error. Use the 14 visible in the template.

4. **Avatar upload in Profile Setup**
   - What we know: `expo-image-picker` is installed. Screen template shows an avatar with a camera badge. `avatarUrl` is stored as a string (base64 or URL) per Phase 30 DB schema.
   - What's unclear: Whether to send the full base64 image or a presigned URL. Current pattern (per CLAUDE.md) stores base64 in the DB directly.
   - Recommendation: Use base64 via `expo-image-picker` with `base64: true` option. Send as `avatarUrl` in `PUT /api/users/me`. Profile Setup is Step 1 of 2; avatar is optional (has Skip).

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `apps/gatherly-mobile/app/_layout.tsx` — existing `Stack.Protected` pattern, auth guard structure
- Codebase inspection: `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — `User` type, `signIn`, `SessionProvider` structure
- Codebase inspection: `apps/gatherly-mobile/app/api/auth.ts` — `User` interface (missing `onboardingComplete`)
- Codebase inspection: `apps/gatherly-mobile/app/api/users.ts` — `UserProfile` (missing Phase 30 fields), `updateMe` narrow signature
- Codebase inspection: `apps/api/src/routes/users.ts` — backend `PUT /api/users/me` dynamic-patch contract, one-way `onboardingComplete` flag
- Screen templates: `screen-templates/Welcoming/Getting-Started.png`, `Preferences.png`, `Profile-Setup.png` — visual spec for all three new screens
- Package audit: `apps/gatherly-mobile/package.json` — confirmed expo-haptics NOT installed, expo-router 6.0.23, reanimated 4.1.6

### Secondary (MEDIUM confidence)

- React Native FlatList `pagingEnabled` + `scrollEventThrottle` carousel pattern — standard RN pattern, widely documented, consistent with existing FlatList usage in codebase

### Tertiary (LOW confidence)

- Interest category count "13" from ONBOARD-02 spec — contradicted by visual template (14 visible); treat template as authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in `package.json` and `node_modules`
- Architecture: HIGH — based on reading actual source files, not assumptions
- Pitfalls: HIGH — derived from reading actual type definitions and finding the gaps (missing fields in `User`/`UserProfile`, narrow `updateMe` signature)
- Open questions: MEDIUM — based on what the code currently shows; auth route backend not inspected

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (30 days — stable Expo SDK / RN stack)
