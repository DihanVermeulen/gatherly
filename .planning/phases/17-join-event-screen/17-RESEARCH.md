# Phase 17: Join Event Screen - Research

**Researched:** 2026-02-27
**Domain:** Expo Router deep links, invite API, multi-state UI, auth-conditional flows
**Confidence:** HIGH (codebase investigation) / MEDIUM (Expo Router URL format for deep links)

## Summary

Phase 17 implements the Join Event screen — a full-screen experience that handles a deep-linked invite code. The screen is publicly accessible (no auth required to view), but joining requires auth; unauthenticated users see a "Log in to join" CTA and after login/register are auto-joined without a second confirmation step.

The critical architectural insight is that the existing `join.tsx` file already exists as a public route (`Stack.Screen name="join"` outside both `Stack.Protected` guards in `_layout.tsx`). It currently receives a `token` query param via `useLocalSearchParams`. The join.tsx file is a placeholder — it needs to be fully replaced. The invite code arrives as a query param (`?token=XYZ`), not a path segment, because the current file is `join.tsx` not `join/[code].tsx`.

The API is already complete and well-structured. The validate endpoint (`POST /invites/validate`) is public and rate-limited. The accept endpoint (`POST /invites/:code/accept`) is also public but requires a `participantName` in the body. Critically: the CONTEXT says joining requires auth — but the backend accept endpoint does NOT require auth. This means the app must enforce auth on the client side before calling accept. The user's authenticated name should be used as `participantName`, not a separate form field.

**Primary recommendation:** Implement as a single `join.tsx` file using a local state machine (`type JoinState = 'loading' | 'preview' | 'joining' | 'success' | 'already-joined' | 'invalid' | 'error'`) with conditional rendering per state. Preserve the invite code in `AsyncStorage` or a module-level variable before redirecting to auth, then auto-join on return.

## Standard Stack

All libraries already installed. No new dependencies needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~6.0.4 | Navigation, route params, `router.replace` | Already used throughout app |
| GlueStack UI | @gluestack-ui/core 3.0.12 | All UI components | Project standard — TMPL-03 |
| react-native-reanimated | ~4.1.0 | Success state animation | Already installed, handles RN animation |
| @legendapp/motion | 2.4.0 | Alternative animation option | Already installed |
| NativeWind | 4.2.1 | Styling via className | Project standard |
| axios (via apiClient) | 1.13.5 | API calls | Project standard |

### GlueStack Components to Use
| Component | Import Path | Use |
|-----------|-------------|-----|
| `Skeleton` | `@/components/ui/skeleton` | Loading state hero + card skeleton |
| `SkeletonText` | `@/components/ui/skeleton` | Skeleton text lines |
| `Spinner` | `@/components/ui/spinner` | Full-screen joining overlay |
| `Text` | `@/components/ui/text` | All text |
| `Button`, `ButtonText` | `@/components/ui/button` | Join CTA, Log in CTA, error CTAs |
| `Pressable` | `@/components/ui/pressable` | Interactive elements |
| `VStack`, `HStack` | `@/components/ui/vstack`, `hstack` | Layout |
| `View` (RN) | `react-native` | Containers |

**No new installations required.** All libraries are present.

## Architecture Patterns

### Route File Location
The file already exists: `apps/gatherly-mobile/app/join.tsx`

It is registered as a public route in `_layout.tsx`:
```tsx
// Source: apps/gatherly-mobile/app/_layout.tsx line 116
<Stack.Screen name="join" options={{ headerShown: false }} />
```
This is OUTSIDE both `Stack.Protected` blocks — correct for a public screen.

### How the Invite Code Arrives
The invite code arrives as a query param, not a path segment. Current join.tsx uses:
```tsx
const { token } = useLocalSearchParams<{ token: string }>();
```
The API constructs invite URLs as `${frontendUrl}/join/${inviteCode}` (path segment), but the mobile deep link uses query params: `gatherly://join?token=<code>`.

**Note:** The existing `join.tsx` uses `token` as the param name. The API validate endpoint expects `{ code }` in the body. These are different names — `token` is the query param key in the URL, `code` is what gets sent to the API.

### Recommended File Structure
```
apps/gatherly-mobile/app/
└── join.tsx          # Replace entirely — implements all join flow states
```

No sub-routes needed. All states are handled via local state in a single component.

### Pattern 1: State Machine with Conditional Rendering

**What:** A single `JoinState` type drives all rendered UI. Each state maps to a distinct component tree.

**When to use:** Multi-state screens where each state is mutually exclusive and visually distinct.

```typescript
// Source: Pattern from existing screens (edit-event.tsx, my-wishlist.tsx)
type JoinState =
  | 'loading'        // Skeleton — waiting for validate API response
  | 'preview'        // Event preview card + Join button (or Log in CTA)
  | 'joining'        // Full-screen loading overlay during accept API call
  | 'success'        // Brief success screen (auto-dismisses after ~2s)
  | 'already-joined' // User is already a participant
  | 'invalid'        // Invite not found or expired
  | 'error';         // Network or unexpected error

const [joinState, setJoinState] = useState<JoinState>('loading');
```

### Pattern 2: Hero Color Cycling (Exact Reproduction)

The Events list (`(tabs)/index.tsx`) uses Tailwind class names for hero colors. Event Details (`event-details.tsx`) uses hex values with inline styles because NativeWind cannot resolve dynamic hex values at runtime. For the Join screen, we don't have an index into a list — we need to derive a stable color from the event ID or use a hash.

**CRITICAL:** Since we're showing a single event preview, not a list, we don't have an `eventIndex`. Use a deterministic function to map eventId to a color index.

```typescript
// Source: apps/gatherly-mobile/app/event-details.tsx lines 25-32
// Exact HERO_COLORS array used in event-details (hex values for inline style)
const HERO_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
];

// Derive stable color from eventId (a number from the API)
const heroColor = HERO_COLORS[eventId % HERO_COLORS.length];

// Use as inline style — NOT className:
// Source: apps/gatherly-mobile/app/event-details.tsx line 108-111
<View
  className="mx-4 rounded-2xl h-48 items-center justify-center"
  style={{ backgroundColor: heroColor }}
>
```

### Pattern 3: Invite Validation and Accept API

The API endpoints are both under `/api/` prefix (same as all other routes):

```typescript
// Source: apps/api/src/routes/invites.ts lines 178-216
// POST /invites/validate — public, rate limited (10 req/15min per IP)
// Body: { code: string }
// Success 200: { eventId: number, eventName: string, inviteId: number }
// Fail 404: { error: "Invalid or expired invite" }

// POST /invites/:code/accept — public, rate limited
// Body: { participantName: string, email?: string }
// Success 200: { eventId, participantId, participantName, eventName }
// Already joined (same name): 200 with existing participantId (idempotent by name match)
// Invalid code: 404 { error: "Invalid or expired invite" }
// Missing name: 400 { error: "Participant name is required" }
```

**CRITICAL INSIGHT:** The accept endpoint is idempotent by participant name — if a participant with that name already exists in the event, it returns their existing ID and sets invite status to accepted. There is NO dedicated "already joined" response code. The "already joined" state must be detected client-side: check if the user is already a participant in the event before calling accept, OR detect it by checking `EventsContext` events list.

**IMPLICATION for "already joined" detection:** After validate succeeds and we have `eventId`, check `EventsContext` events for that eventId AND confirm the authenticated user's name is in `event.people`. If yes → `already-joined` state.

### Pattern 4: Auth-Conditional Join + Auto-Join After Login

The CONTEXT decision: "After login/register from 'Log in to join': auto-join and navigate directly to Event Details."

This requires preserving the invite code across navigation. The approach:

```typescript
// Module-level variable for pending invite (persists across component remounts within session)
// Module scope survives navigation stack changes
let _pendingInviteCode: string | null = null;

export function setPendingInviteCode(code: string) {
  _pendingInviteCode = code;
}
export function consumePendingInviteCode(): string | null {
  const code = _pendingInviteCode;
  _pendingInviteCode = null;
  return code;
}
```

**Alternative:** `AsyncStorage` — survives app restart but adds async overhead. Module variable is simpler and sufficient since auth screens are in the same session.

**How the auto-join works:**
1. Unauthenticated user lands on join screen → shows preview with "Log in to join"
2. User taps "Log in to join" → store invite code in module var → `router.push('/sign-in')`
3. After successful sign-in/register, `signIn()` is called → `Stack.Protected` guard transitions user to authenticated screens
4. BUT: The join screen needs to check for pending invite on auth state change — the cleanest approach is to check in `_layout.tsx` or in the sign-in/register completion handler

**Recommended approach:** After `signIn()` in sign-in.tsx/register.tsx, check `consumePendingInviteCode()`. If a code exists, instead of relying on automatic navigation, explicitly `router.replace('/join?token=' + code)`. This re-triggers the join flow which now runs as an authenticated user and auto-joins.

### Pattern 5: Network Error Retry + Give Up Logic

```typescript
// Source: CONTEXT decision — 3 failed attempts = replace with graphic
const [networkAttempts, setNetworkAttempts] = useState(0);
const MAX_ATTEMPTS = 3;

// On each failed join attempt:
setNetworkAttempts(prev => prev + 1);

// Render logic:
{networkAttempts >= MAX_ATTEMPTS
  ? <GiveUpState />          // Graphic + "Come back later"
  : <JoinErrorInline />      // Inline error below button
}
```

### Pattern 6: Full-Screen Loading Overlay (Joining State)

```typescript
// Source: CONTEXT decision — full-screen overlay during API call
// Pattern from existing screens using Modal or absolute positioned overlay
{joinState === 'joining' && (
  <View
    style={StyleSheet.absoluteFillObject}
    className="bg-black/50 items-center justify-center z-50"
  >
    <Spinner size="large" className="text-white" />
  </View>
)}
```

Note: `Spinner` from `@/components/ui/spinner` is GlueStack's wrapper over React Native's `ActivityIndicator`. Per STATE.md decision, use `Spinner` (not `ButtonSpinner` which requires Button context) for standalone spinners.

### Pattern 7: Success Screen with Auto-Navigate

```typescript
// Source: CONTEXT decision — ~2 second success screen then auto-navigate
useEffect(() => {
  if (joinState === 'success') {
    const timer = setTimeout(() => {
      router.replace(`/event-details?id=${joinedEventId}`);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [joinState, joinedEventId]);
```

### Pattern 8: Skeleton Loading State

The `Skeleton` and `SkeletonText` components are already in the codebase:

```typescript
// Source: apps/gatherly-mobile/components/ui/skeleton/index.tsx
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Usage: isLoaded=false shows pulse animation, isLoaded=true renders children
<Skeleton variant="rounded" isLoaded={false} className="h-48 w-full rounded-2xl" />
<SkeletonText _lines={2} isLoaded={false} className="h-5 mt-2" />
```

**Important:** `Skeleton` renders an `Animated.View` when `isLoaded=false`. It uses `Animated.loop` which starts immediately. No extra configuration needed.

### Pattern 9: Back Navigation (Disabled — Full-Screen Modal Feel)

Per CONTEXT: "no header back arrow, no close X." The screen has `headerShown: false` already in `_layout.tsx`. The `Stack.Screen` options need `gestureEnabled: false` as well to prevent swipe-back gesture on iOS.

```typescript
// In _layout.tsx or via <Stack.Screen /> inside component:
<Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
```

### Recommended Project Structure for This Phase

```
apps/gatherly-mobile/
├── app/
│   ├── join.tsx                    # Replace with full implementation
│   ├── sign-in.tsx                 # Add pending invite check after signIn()
│   ├── register.tsx               # Add pending invite check after signIn()
│   └── api/
│       └── invites.ts             # Add validate() and accept() functions
└── (no new files needed)
```

### Anti-Patterns to Avoid

- **Using `Stack.Protected` for join screen:** It's already correctly outside both guards. Do not move it.
- **Building a name-entry form for join:** The CONTEXT requires auth before joining — use `user.name` from `useSession()` as `participantName`. No separate name input needed.
- **Calling accept without auth check:** The API accept endpoint is public and would create a participant without an account. The client must require auth first.
- **Using `router.push` for post-join navigation:** Use `router.replace` to clear join screen from stack so back button from Event Details doesn't go back to join.
- **Using Tailwind `className` for dynamic heroColor hex values:** Confirmed anti-pattern from STATE.md — always use inline `style={{ backgroundColor: heroColor }}`.
- **Calling `EventsContext.refreshEvents()` without checking `useApi`:** The join screen might be reached before EventsContext has initialized. Trigger `refreshEvents()` after successful join to update the events list.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton animation | Custom pulse with setInterval | `Skeleton` from `@/components/ui/skeleton` | Already built with `Animated.loop`, handles useNativeDriver correctly |
| Loading spinner | Custom ActivityIndicator | `Spinner` from `@/components/ui/spinner` | GlueStack wrapper with cssInterop for NativeWind className support |
| Retry counter logic | Complex state + debounce | Simple `networkAttempts` counter | 3 attempts is a simple counter, no library needed |
| Token storage across nav | Shared state / context | Module-level variable | Context rerenders; module var is stable and simple for this use case |
| Color from eventId | Custom hash function | `eventId % HERO_COLORS.length` | Already established pattern in event-details.tsx |

**Key insight:** All UI primitives exist in GlueStack. The only new code is state machine logic and API integration.

## Common Pitfalls

### Pitfall 1: "Already Joined" Not Detectable from API Response
**What goes wrong:** Developer calls `POST /invites/:code/accept` expecting a special "already joined" response code. Gets 200 with a participant back — no error.
**Why it happens:** The accept endpoint is idempotent by name. It reuses the existing participant if the name matches.
**How to avoid:** Before calling accept, check `EventsContext` for whether the user is already in the event. After validate returns `eventId`, look up the event: `events.find(e => e.id === String(eventId))`. If found and user's name is in `event.people`, go to `already-joined` state without calling accept.
**Warning signs:** "Already joined" state never appears; users silently get a 200 from accept.

### Pitfall 2: Invite Code Param Name Mismatch
**What goes wrong:** Developer uses `code` as the query param but the current join.tsx uses `token`. The deep link URL uses `token`.
**Why it happens:** The API endpoint uses `code` in the request body, but the URL query param in the mobile deep link is `token`.
**How to avoid:** Keep using `token` as the query param name: `const { token } = useLocalSearchParams<{ token: string }>()`. Pass it to the API as `code`: `invitesApi.validate({ code: token })`.

### Pitfall 3: Auth State Race on Return From Login
**What goes wrong:** User taps "Log in to join", authenticates, returns to app, but the auto-join doesn't trigger because the join screen has been unmounted.
**Why it happens:** `Stack.Protected` unmounts/mounts screens when auth state changes. The join screen may be ejected from the stack.
**How to avoid:** After `signIn()` succeeds in sign-in.tsx or register.tsx, explicitly call `consumePendingInviteCode()` and if a code exists, `router.replace('/join?token=' + code)` before the guard redirects. This ensures the join screen re-mounts with the code and auth state = true, so it auto-joins immediately.

### Pitfall 4: gestureEnabled Not Disabled
**What goes wrong:** User can swipe back on iOS from the join screen to whatever was behind it.
**Why it happens:** `headerShown: false` hides the back arrow but doesn't prevent the gesture.
**How to avoid:** Add `gestureEnabled: false` to the Stack.Screen options for join.

### Pitfall 5: Using ButtonSpinner in Non-Button Context
**What goes wrong:** Developer uses `ButtonSpinner` for the full-screen loading overlay.
**Why it happens:** ButtonSpinner requires GlueStack Button parent context — crashes or behaves oddly outside it.
**How to avoid:** Per STATE.md confirmed pattern: use `Spinner` from `@/components/ui/spinner` for standalone spinners. `ButtonSpinner` only inside `<Button>` components.

### Pitfall 6: Rate Limiter Confusion
**What goes wrong:** Tests or rapid development hits the rate limiter (10 req/15min per IP) on validate and accept endpoints.
**Why it happens:** The API has `inviteValidationLimiter` on both public invite endpoints.
**How to avoid:** Know that 429 responses are possible. Handle them gracefully in the error state with same generic message: "This invite is no longer valid." Don't retry automatically on 429.

### Pitfall 7: participantName from User vs Form
**What goes wrong:** Developer adds a name input form (matching web pattern where anyone can join without auth).
**Why it happens:** The API accept endpoint has `participantName` in body, suggesting a form input.
**How to avoid:** Use `user.name` from `useSession()` directly as `participantName`. The CONTEXT specifies auth is required before joining. No name form is needed.

### Pitfall 8: Validate Returns Limited Event Data
**What goes wrong:** Developer expects `validate` to return organizer name and participant count (required for preview), but it only returns `{ eventId, eventName, inviteId }`.
**Why it happens:** The `POST /invites/validate` endpoint only queries minimal data.
**How to avoid:** After validate succeeds, call `eventsApi.getById(String(eventId))` to get full event details including participant count and organizer. BUT: `getById` requires auth (Bearer token). For unauthenticated users, the preview will only have `eventName` from validate — organizer and participant count are NOT available without auth.

**Open question:** Can participant count and organizer be shown to unauthenticated users? The validate endpoint only returns `eventName`. See Open Questions section.

## Code Examples

### Adding validate() and accept() to invites.ts

```typescript
// Source: Derived from apps/api/src/routes/invites.ts endpoints
// Add to apps/gatherly-mobile/app/api/invites.ts

export type InvitePreview = {
  eventId: number;
  eventName: string;
  inviteId: number;
};

export type JoinResult = {
  eventId: number;
  participantId: number;
  participantName: string;
  eventName: string;
};

export const invitesApi = {
  // ... existing create, list, delete ...

  // Validate an invite code (public)
  validate: (code: string): Promise<InvitePreview> =>
    apiClient
      .post('/api/invites/validate', { code })
      .then((r) => r.data),

  // Accept an invite (public endpoint, but app requires auth client-side)
  accept: (code: string, participantName: string, email?: string): Promise<JoinResult> =>
    apiClient
      .post(`/api/invites/${code}/accept`, { participantName, email })
      .then((r) => r.data),
};
```

### State Machine in join.tsx

```typescript
// Source: Pattern derived from existing screens + CONTEXT decisions
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from './contexts/AuthContext';
import { useEvents } from './contexts/EventsContext';

type JoinState =
  | 'loading'
  | 'preview'
  | 'joining'
  | 'success'
  | 'already-joined'
  | 'invalid'
  | 'error';

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, user } = useSession();
  const { state: { events }, refreshEvents } = useEvents();

  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [previewData, setPreviewData] = useState<{ eventId: number; eventName: string } | null>(null);
  const [joinedEventId, setJoinedEventId] = useState<number | null>(null);
  const [networkAttempts, setNetworkAttempts] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // On mount: validate the invite code
  useEffect(() => {
    if (!token) {
      setJoinState('invalid');
      return;
    }
    validateInvite(token);
  }, [token]);

  // After validate: check if already joined
  useEffect(() => {
    if (joinState === 'preview' && previewData && user) {
      const existingEvent = events.find(e => e.id === String(previewData.eventId));
      if (existingEvent && existingEvent.people?.includes(user.name)) {
        setJoinState('already-joined');
      }
    }
  }, [joinState, previewData, user, events]);

  // Auto-navigate after success
  useEffect(() => {
    if (joinState === 'success' && joinedEventId !== null) {
      const timer = setTimeout(() => {
        router.replace(`/event-details?id=${joinedEventId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [joinState, joinedEventId]);

  // ... validateInvite(), handleJoin() implementations
}
```

### Skeleton Loading State

```typescript
// Source: apps/gatherly-mobile/components/ui/skeleton/index.tsx
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

// Loading state — mimic hero + event card shape
function JoinLoadingSkeleton() {
  return (
    <View className="flex-1 bg-background-0">
      {/* Hero skeleton */}
      <Skeleton
        variant="rounded"
        isLoaded={false}
        className="h-48 mx-4 mt-4 rounded-2xl"
      />
      {/* Event name skeleton */}
      <View className="px-4 mt-6">
        <SkeletonText _lines={1} isLoaded={false} className="h-8 w-3/4 mb-3" />
        <SkeletonText _lines={2} isLoaded={false} className="h-4 mb-6" />
        {/* Button skeleton */}
        <Skeleton variant="rounded" isLoaded={false} className="h-12 rounded-2xl" />
      </View>
    </View>
  );
}
```

### Hero Color for Join Screen

```typescript
// Source: apps/gatherly-mobile/app/event-details.tsx lines 25-32
// Use eventId from validate response to derive heroColor
const HERO_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
];

// eventId is a number from POST /invites/validate response
const heroColor = HERO_COLORS[previewData.eventId % HERO_COLORS.length];
// Use with inline style: style={{ backgroundColor: heroColor }}
```

### Pending Invite Code (Module-Level Variable)

```typescript
// Source: Pattern for preserving state across navigation
// File: apps/gatherly-mobile/app/join.tsx (exported for use in sign-in.tsx/register.tsx)

let _pendingInviteCode: string | null = null;

export function setPendingInviteCode(code: string): void {
  _pendingInviteCode = code;
}

export function consumePendingInviteCode(): string | null {
  const code = _pendingInviteCode;
  _pendingInviteCode = null;
  return code;
}

// In join.tsx — when unauthenticated user taps "Log in to join":
const handleLoginToJoin = () => {
  if (token) setPendingInviteCode(token);
  router.push('/sign-in');
};
```

```typescript
// In sign-in.tsx — after successful login:
import { consumePendingInviteCode } from './join';

const handleLogin = async () => {
  // ... existing login logic ...
  await signIn(response.accessToken, response.user);
  // Check for pending join
  const pendingCode = consumePendingInviteCode();
  if (pendingCode) {
    router.replace(`/join?token=${pendingCode}`);
  }
  // If no pending code, Stack.Protected handles navigation automatically
};
```

### Disabling Back Gesture

```typescript
// Source: Expo Router Stack.Screen options — use inside join.tsx component
import { Stack } from 'expo-router';

export default function JoinScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {/* ... rest of component */}
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare spinner for loading | Skeleton matching content shape | Design norm | Reduces layout shift perception |
| Alert dialogs for errors | Inline error below action | UX best practice | Less disruptive, more contextual |
| `ButtonSpinner` everywhere | `Spinner` outside Button, `ButtonSpinner` inside Button | STATE.md decision | Avoids GlueStack context crash |
| `className` for dynamic colors | `style={{ backgroundColor: hex }}` | STATE.md decision | NativeWind can't handle runtime hex |

**Deprecated/outdated:**
- `join.tsx` placeholder: Current file is a 19-line placeholder. Replace entirely — don't patch.
- `invitesApi.validate`/`accept`: These functions don't exist yet in `invites.ts`. Must be added.

## Open Questions

1. **Unauthenticated preview: participant count and organizer name**
   - What we know: `POST /invites/validate` only returns `{ eventId, eventName, inviteId }`. Organizer and participant count are NOT in this response.
   - What's unclear: Can we show participant count and organizer to unauthenticated users? The `eventsApi.getById()` requires auth (Bearer token), so it won't work for unauthenticated users.
   - Recommendation: For unauthenticated users, show only `eventName` in the preview. Participant count and organizer shown as "—" or hidden. Alternatively, add a public endpoint to get basic event info — but that's a backend change outside phase scope. Accept the limitation: unauthenticated preview shows event name only.

2. **Already-joined detection for events not yet in EventsContext**
   - What we know: EventsContext only contains events the authenticated user belongs to. If the user was added to an event via a previous invite accept, the event may or may not be in the context depending on whether they've synced.
   - What's unclear: Should we call `eventsApi.getById()` to check participant list for already-joined detection, or rely on EventsContext?
   - Recommendation: Use EventsContext first. If event not found in context, proceed to join (accept endpoint is idempotent). After accept returns 200, call `refreshEvents()` and navigate to success. The "already joined" state via EventsContext is a best-effort check.

3. **Template MISSING — implementation must wait for template**
   - What we know: STATE.md says "Phase 17: Join Event template MISSING — must request from user before implementing"
   - What's unclear: Screen layout specifics beyond what CONTEXT describes
   - Recommendation: The PLAN.md for the implementation task should include a blocking step: request template from user before writing any UI code. Research is complete; planning can proceed, but implementation task must gate on template delivery.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `apps/gatherly-mobile/app/join.tsx` — current placeholder, token param name
- Direct codebase inspection: `apps/gatherly-mobile/app/_layout.tsx` — join route as public Stack.Screen
- Direct codebase inspection: `apps/api/src/routes/invites.ts` — full API specification, response shapes, rate limits
- Direct codebase inspection: `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — useSession(), signIn() signature
- Direct codebase inspection: `apps/gatherly-mobile/app/contexts/EventsContext.tsx` — refreshEvents(), events shape
- Direct codebase inspection: `apps/gatherly-mobile/components/ui/skeleton/index.tsx` — Skeleton/SkeletonText API
- Direct codebase inspection: `apps/gatherly-mobile/components/ui/spinner/index.tsx` — Spinner (ActivityIndicator wrapper)
- Direct codebase inspection: `apps/gatherly-mobile/app/(tabs)/index.tsx` — HERO_COLORS Tailwind class pattern
- Direct codebase inspection: `apps/gatherly-mobile/app/event-details.tsx` — HERO_COLORS hex pattern + heroColor derivation
- Direct codebase inspection: `apps/gatherly-mobile/app.json` — scheme: "gatherly"
- Direct codebase inspection: `apps/gatherly-mobile/app/api/invites.ts` — existing invitesApi (missing validate/accept)
- Direct codebase inspection: `apps/gatherly-mobile/package.json` — expo-router ~6.0.4, expo ^54.0.7

### Secondary (MEDIUM confidence)
- Expo official docs (WebFetch): `https://docs.expo.dev/linking/overview/` — confirmed deep links use scheme://path/segment format; Expo Router auto-enables all routes as deep links
- Expo official docs (WebFetch): `https://docs.expo.dev/router/reference/url-parameters/` — confirmed `useLocalSearchParams` returns both route params and query params; both accessible via same hook

### Tertiary (LOW confidence)
- WebSearch 2026: Expo Router 6 deep linking — confirms file-based routing = deep link routing, scheme in app.json

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified in codebase, no new libraries needed
- API spec: HIGH — read directly from invites.ts source
- Architecture patterns: HIGH — derived from existing patterns in codebase
- Deep link URL format: MEDIUM — confirmed conceptually via docs but exact `gatherly://join?token=XYZ` format not explicitly verified
- Pitfalls: HIGH — all derived from specific code findings and STATE.md decisions

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (stable codebase; API and library versions won't change within 30 days)
