# Phase 11: Navigation Foundation - Research

**Researched:** 2026-02-23
**Domain:** Expo Router v6 file-based navigation, auth guard routing, deep links
**Confidence:** HIGH

---

## Summary

Phase 11 establishes the navigation shell for Gatherly Mobile using Expo Router v6 (installed: expo-router@6.0.23, expo@54.0.33). The codebase already has a partially wired Expo Router structure but uses an incorrect folder layout (`app/tabs/(tabs)/`) and a placeholder app scheme (`starterkitexpo`). This phase requires restructuring to the canonical `app/(tabs)/` convention, adding an auth guard via `Stack.Protected`, a stub AuthContext (the real JWT implementation is Phase 12), and changing the app scheme to `gatherly` for deep links.

The standard approach for auth-guarded tab navigation in Expo Router v6 is: root `_layout.tsx` wraps everything in providers and uses `Stack.Protected` to gate the `(tabs)` group behind auth; unauthenticated users see `sign-in.tsx`. Both `Stack.Protected` and `Tabs.Protected` are confirmed exported in the installed expo-router@6.0.23 build.

Deep linking is automatic in Expo Router — all file routes become deep links once the `scheme` field in `app.json` is set. Setting `scheme: "gatherly"` makes `gatherly://join` open `app/join.tsx` automatically.

**Primary recommendation:** Restructure to `app/(tabs)/` + `app/sign-in.tsx` + `app/(tabs)/_layout.tsx` with `Stack.Protected` guard in root layout. Use `<Redirect href="/sign-in" />` as a belt-and-suspenders fallback inside `(tabs)/_layout.tsx`. Change app scheme to `gatherly`.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~6.0.23 | File-based routing, tabs, deep links | Official Expo navigation for SDK 54 |
| expo-linking | ~8.0.8 | Deep link URL parsing | Integrates with expo-router automatically |
| @react-navigation/native | ^7.1.6 | Underlying navigation engine | Required peer of expo-router |
| @react-navigation/bottom-tabs | (bundled) | Bottom tab UI | Powers `Tabs` in expo-router |
| expo-secure-store | (check) | Persistent token storage | Used in AuthContext for session |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react-native | ^0.510.0 | Tab bar icons | Already installed; use for tab icons |
| @expo/vector-icons | ^15.0.2 | Fallback icon set | Avoid — prefer lucide for consistency |
| expo-splash-screen | ~31.0.10 | Hold splash until auth resolves | Required during auth loading |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stack.Protected | `<Redirect>` in each screen | Redirect approach is SDK 52 pattern; Stack.Protected is cleaner in SDK 53+ |
| lucide-react-native | @expo/vector-icons FontAwesome | Both work; lucide is already used in index.tsx |
| Route group `(tabs)` | Flat files at root | Route groups are the canonical pattern for tab-scoped screens |

**Installation:** No new packages needed — all required libraries are installed.

---

## Architecture Patterns

### Recommended Project Structure

The current structure needs to be reorganized. Current state vs target state:

**Current (broken/incomplete):**
```
app/
├── _layout.tsx          ← uses <Slot />, no auth guard
├── index.tsx            ← Events screen (at root, correct)
├── edit-event.tsx
├── modal.tsx
├── +html.tsx
├── +not-found.tsx
└── tabs/                ← WRONG: should be (tabs) at root, not in a subfolder
    ├── _layout.tsx      ← Stack wrapping (tabs), misplaced
    └── (tabs)/
        ├── _layout.tsx  ← actual Tabs navigator
        ├── tab1.tsx
        └── tab2.tsx
```

**Target (this phase):**
```
app/
├── _layout.tsx          ← Root: providers + Stack.Protected auth guard
├── sign-in.tsx          ← Public screen (stub for Phase 12)
├── (tabs)/
│   ├── _layout.tsx      ← Tabs navigator with tab bar config
│   ├── index.tsx        ← Events screen (move from app/index.tsx)
│   ├── profile.tsx      ← Profile tab (stub)
│   └── [other-tabs].tsx ← Additional tab stubs as needed
├── join.tsx             ← Join Event screen (deep link target, stub for Phase 17)
├── edit-event.tsx       ← Keep as-is (stack screen above tabs)
├── modal.tsx
├── +html.tsx
└── +not-found.tsx
```

### Pattern 1: Root Layout with Stack.Protected Auth Guard

**What:** The root `app/_layout.tsx` wraps providers and uses `Stack.Protected` to declaratively gate route groups behind authentication state.

**When to use:** Always — this is the recommended SDK 53+ pattern.

**Example (verified from official Expo docs + installed type defs):**
```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '../contexts/AuthContext';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();

  // Hold splash screen while auth state loads
  if (isLoading) {
    return null; // Splash screen still showing
  }

  SplashScreen.hideAsync();

  return (
    <Stack>
      {/* Authenticated routes */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-event" options={{ title: 'Edit Event' }} />
      </Stack.Protected>

      {/* Unauthenticated routes */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Public routes accessible regardless of auth */}
      <Stack.Screen name="join" options={{ headerShown: false }} />
    </Stack>
  );
}
```

**Source:** `node_modules/expo-router/build/layouts/StackClient.d.ts` (confirmed `Protected: FunctionComponent<ProtectedProps>`) + https://docs.expo.dev/router/advanced/protected/

### Pattern 2: Tabs Layout with Tab Bar Icons

**What:** `app/(tabs)/_layout.tsx` defines the bottom tab bar using `Tabs` from expo-router with lucide icons.

**When to use:** Inside the `(tabs)` route group.

**Example:**
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Calendar, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1', // indigo-500
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Source:** https://docs.expo.dev/router/advanced/tabs/

### Pattern 3: Stub AuthContext for Phase 11

**What:** A minimal AuthContext that returns `session: null` (unauthenticated) so auth guard redirects work. Phase 12 replaces the internals with real JWT logic.

**When to use:** Phase 11 only needs the shape; Phase 12 fills in real logic.

**Example:**
```tsx
// contexts/AuthContext.tsx
import { createContext, use, useState, type PropsWithChildren } from 'react';

type AuthContextValue = {
  session: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [isLoading] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        signIn: (token) => setSession(token),
        signOut: () => setSession(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

**Note:** Phase 12 will replace `useState` with `useStorageState` (expo-secure-store) and real JWT logic. The interface signature must remain stable across phases.

### Pattern 4: Deep Link Configuration

**What:** Setting `scheme` in `app.json` enables custom URL scheme deep links. Expo Router automatically maps all file routes to deep links.

**When to use:** Set once; all routes automatically get deep link support.

**Configuration:**
```json
// app.json
{
  "expo": {
    "scheme": "gatherly",
    "name": "Gatherly",
    "slug": "gatherly"
  }
}
```

With this scheme:
- `gatherly://` → opens app at root (redirects to Events if authenticated)
- `gatherly://join?token=abc` → opens `app/join.tsx` with `token=abc`
- `gatherly://sign-in` → opens `app/sign-in.tsx`

**Source:** https://docs.expo.dev/linking/into-your-app/

### Anti-Patterns to Avoid

- **`app/tabs/(tabs)/` nesting:** The current file structure is wrong. Tabs must be at `app/(tabs)/` not nested under a non-group `tabs/` directory.
- **Manual `useEffect` redirect:** Don't use `useEffect(() => { router.replace('/sign-in') }, [session])` — `Stack.Protected` handles this declaratively and removes history entries.
- **`<Redirect>` as sole auth mechanism:** The `<Redirect>` component is the SDK 52 pattern. Use `Stack.Protected` as the primary guard; `<Redirect>` can be a belt-and-suspenders fallback in `(tabs)/_layout.tsx`.
- **Checking auth on every screen:** Auth guard belongs in the root layout, not repeated on each screen.
- **Using `router.push` for tab navigation:** Use `href` or `router.replace` to navigate to tab screens to avoid broken back stack.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth redirect logic | Custom useEffect with router.replace | Stack.Protected guard | Handles deep links correctly, removes history, handles race conditions |
| Tab bar component | Custom View with Pressables | Tabs from expo-router | Platform-native appearance, accessibility, keyboard handling |
| Deep link routing | Manual Linking.addEventListener | Expo Router automatic routing | All routes auto-get deep links; zero config |
| Token persistence | AsyncStorage directly | expo-secure-store (in Phase 12) | Encrypted storage on native, localStorage fallback on web |

**Key insight:** Expo Router's `Stack.Protected` handles the redirect-on-deep-link scenario automatically — if an unauthenticated user taps a `gatherly://` invite URL that would open a protected screen, they are redirected to `sign-in` first. Building this manually with `useEffect` misses this case.

---

## Common Pitfalls

### Pitfall 1: Wrong Tabs Directory Location

**What goes wrong:** Tabs are placed at `app/tabs/(tabs)/` (current state) instead of `app/(tabs)/`. Routes won't resolve correctly — `router.push('/tabs/tab1')` won't work after restructuring.

**Why it happens:** The starter kit used a non-standard nested structure.

**How to avoid:** Tabs must live at `app/(tabs)/`. The existing `app/tabs/` directory and its contents must be deleted and recreated at the correct path.

**Warning signs:** Routes like `/tabs/tab1` appearing in navigation instead of the intended tab structure.

### Pitfall 2: Missing `_layout.tsx` Inside `(tabs)` Group

**What goes wrong:** `Protected` route redirect doesn't work; screens show incorrect initial state.

**Why it happens:** Expo Router requires a `_layout.tsx` in every group directory.

**How to avoid:** Always create `app/(tabs)/_layout.tsx` with the `<Tabs>` navigator.

### Pitfall 3: Auth State Not Available During Initial Render

**What goes wrong:** Splash screen flashes login screen before auth state loads, even when user is authenticated.

**Why it happens:** Auth state is loaded asynchronously; root layout renders before async load completes.

**How to avoid:** Keep `SplashScreen.preventAutoHideAsync()` at root level. In `RootNavigator`, return `null` while `isLoading` is true (splash screen stays visible). Call `SplashScreen.hideAsync()` only after auth state is known.

**Warning signs:** Brief flash of login screen before redirect to Events.

### Pitfall 4: `Tabs.Protected` vs `Stack.Protected` Confusion

**What goes wrong:** Using `Tabs.Protected` inside a `Stack` layout or vice versa. Also: early SDK 53 releases had a bug where `Tabs.Protected` wasn't exported — confirmed fixed in expo-router@6.0.23 (type defs show `Tabs.Protected: typeof Protected`).

**How to avoid:** Use `Stack.Protected` in `app/_layout.tsx` (root Stack) to gate entire route groups. Use `Tabs.Protected` only if you need to hide specific tabs from the tab bar based on auth (e.g., an admin-only tab). For this phase, `Stack.Protected` at the root is sufficient.

### Pitfall 5: `scheme` Change Requires Rebuild

**What goes wrong:** Changing `scheme` in `app.json` from `starterkitexpo` to `gatherly` has no effect on Expo Go or existing builds.

**Why it happens:** The scheme is baked into native builds; Expo Go uses its own scheme.

**How to avoid:** After changing the scheme, test deep links using `npx uri-scheme open gatherly://join --ios` (simulator) or via Expo's development client. Note that in Expo Go, the scheme is `exp://` — custom schemes require a development build.

### Pitfall 6: `app/index.tsx` Conflicts with `app/(tabs)/index.tsx`

**What goes wrong:** Having both `app/index.tsx` and `app/(tabs)/index.tsx` causes a routing conflict — Expo Router doesn't know which to serve for `/`.

**Why it happens:** The Events screen is currently at `app/index.tsx` (root). After adding `(tabs)`, the Events screen should move to `app/(tabs)/index.tsx`.

**How to avoid:** Delete or convert `app/index.tsx` to a redirect: `export default function Index() { return <Redirect href="/(tabs)" />; }`. Better: just delete it since `(tabs)/index.tsx` will serve `/` automatically.

---

## Code Examples

Verified patterns from official sources and installed package type defs:

### Stack.Protected API (confirmed from installed types)

```tsx
// Source: node_modules/expo-router/build/layouts/StackClient.d.ts
// Protected: FunctionComponent<{ guard: boolean; children?: ReactNode }>

<Stack>
  <Stack.Protected guard={!!session}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  </Stack.Protected>
  <Stack.Protected guard={!session}>
    <Stack.Screen name="sign-in" options={{ headerShown: false }} />
  </Stack.Protected>
</Stack>
```

### Tabs.Protected API (confirmed from installed types)

```tsx
// Source: node_modules/expo-router/build/layouts/TabsClient.d.ts
// Tabs.Protected: FunctionComponent<{ guard: boolean; children?: ReactNode }>

// Only needed if certain tabs should be hidden from unauthenticated users
// (not required for Phase 11 since Stack.Protected gates the whole (tabs) group)
<Tabs>
  <Tabs.Screen name="index" options={{ title: 'Events' }} />
  <Tabs.Protected guard={isAdmin}>
    <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
  </Tabs.Protected>
</Tabs>
```

### Deep Link URL Format

```
// After setting scheme: "gatherly" in app.json
gatherly://                     → app root → redirects to (tabs) if authenticated
gatherly://join?token=abc123    → app/join.tsx with token param
gatherly://sign-in              → app/sign-in.tsx

// Testing in iOS simulator:
npx uri-scheme open "gatherly://join?token=test123" --ios

// Testing in Android:
npx uri-scheme open "gatherly://join?token=test123" --android
```

### Reading Deep Link Params

```tsx
// app/join.tsx
import { useLocalSearchParams } from 'expo-router';

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  // token contains the invite token from the URL
}
```

### Tab Bar Icon with Lucide

```tsx
// Source: https://docs.expo.dev/router/advanced/tabs/
import { Tabs } from 'expo-router';
import { Calendar, User, Gift } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useEffect` + `router.replace` for auth redirect | `Stack.Protected guard={!!session}` | SDK 53 (expo-router v4) | Declarative, history-safe, handles deep links correctly |
| Manual Linking.addEventListener for deep links | Automatic (file = route = deep link) | expo-router v1+ | Zero config needed |
| Redirect component in layout files | Stack.Protected at root | SDK 53+ | Less boilerplate, correct redirect semantics |
| FontAwesome via @expo/vector-icons | Lucide / SF Symbols | SDK 54 / expo-router v6 | Native tab bar uses SF Symbols on iOS |

**Deprecated/outdated:**
- `unstable_settings.initialRouteName` in layout files: Still works but the correct way is to structure files so the correct screen is the natural first route.
- The `tabs/` nested structure (current in repo): Non-standard, replace with `(tabs)/` at root.
- `starterkitexpo` scheme: Replace with `gatherly`.

---

## Open Questions

1. **Which tabs appear in the bottom nav for Phase 11?**
   - What we know: Requirements say "all main sections reachable from persistent navigation" but don't list tabs explicitly. Events is tab 1. Phase context mentions a Profile tab.
   - What's unclear: Are there 2 tabs or 3? Should there be a "Profile" or "Settings" tab?
   - Recommendation: Create Events + Profile tabs as stubs. Add more in later phases. Require screen template for any tab that shows real content (TMPL-02 rule).

2. **Does `join.tsx` need to be inside or outside `(tabs)`?**
   - What we know: Join Event is a deep link target that should open as a full-screen modal/stack, not as a tab.
   - What's unclear: Should it be a modal-style stack screen or a regular screen?
   - Recommendation: Place `app/join.tsx` outside `(tabs)` as a Stack screen. It should be accessible regardless of auth state (invite links must work even for unauthenticated users). Add it to the root Stack outside both `Stack.Protected` blocks.

3. **Should Login and Join Event templates be requested from user now?**
   - What we know: STATE.md says Login template is MISSING. Join template is MISSING. TMPL-02 requires asking for missing templates before implementing.
   - What's unclear: Phase 11 only implements stubs for these screens. Full implementation is Phase 12 (Login) and Phase 17 (Join).
   - Recommendation: In Phase 11, implement `sign-in.tsx` and `join.tsx` as minimal navigation-wiring stubs (text + placeholder button), not full screens. Don't invoke TMPL-02 blocking until Phase 12 and Phase 17 respectively.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/expo-router/build/layouts/StackClient.d.ts` — Confirmed `Stack.Protected: FunctionComponent<ProtectedProps>` in installed expo-router@6.0.23
- `node_modules/expo-router/build/layouts/TabsClient.d.ts` — Confirmed `Tabs.Protected: typeof Protected` in installed expo-router@6.0.23
- `node_modules/expo-router/build/views/Protected.d.ts` — Confirmed `ProtectedProps = { guard: boolean; children?: ReactNode }`
- https://docs.expo.dev/router/advanced/protected/ — Stack.Protected API and SDK 53+ requirement
- https://docs.expo.dev/router/advanced/authentication/ — Full auth pattern with SessionProvider, useStorageState, splash screen wiring
- https://docs.expo.dev/router/advanced/tabs/ — Bottom tabs file structure and layout pattern
- https://docs.expo.dev/linking/into-your-app/ — Scheme configuration in app.json

### Secondary (MEDIUM confidence)
- https://docs.expo.dev/router/advanced/authentication-rewrites/ — Redirect-based auth (confirmed as "SDK 52 and earlier" approach; validates Stack.Protected is the SDK 53+ standard)
- https://docs.expo.dev/router/reference/redirects/ — `<Redirect>` component API for belt-and-suspenders fallback

### Tertiary (LOW confidence)
- GitHub issue #37160 / #37161: Tabs.Protected bug in early SDK 53 — closed as "outdated," confirmed fixed in expo-router@6.0.23 by type def inspection
- GitHub issue #37305: Protected routes behavior issues — workarounds documented; mitigated by using Stack.Protected at root rather than Tabs.Protected

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries confirmed installed and version-verified in node_modules
- Architecture (file structure, Stack.Protected): HIGH — Verified against official docs and installed type definitions
- Auth stub pattern: HIGH — Pattern sourced directly from official Expo auth docs
- Deep link config: HIGH — app.json scheme property verified, Expo Router automatic routing confirmed
- Pitfalls: MEDIUM — Most verified against official docs; Tabs.Protected bug status verified against installed package

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (expo-router updates frequently; verify Stack.Protected API before any SDK upgrade)
