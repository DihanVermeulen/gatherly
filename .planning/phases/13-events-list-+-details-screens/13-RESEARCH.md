# Phase 13: Events List + Details Screens - Research

**Researched:** 2026-02-24
**Domain:** React Native / Expo Router / GlueStack UI — events list + details screens
**Confidence:** HIGH (all findings verified directly from codebase)

---

## Summary

Phase 13 requires completing the Events list screen (index.tsx) and creating a new Details screen for the gatherly-mobile Expo app. Both screens must match PNG templates in `screen-templates/`. The Events.png template is a concert-discovery layout that must be adapted to a gift-exchange context while preserving its structural patterns. The Details.png is a clean event-details layout that maps directly to gatherly's data model.

The codebase is largely in place: EventsContext provides all data, the API client handles auth automatically, GlueStack UI components cover all needed primitives, and Expo Router file-based routing handles navigation. The primary work is:
1. Rework index.tsx to match Events.png (layout only — keep underlying data/logic)
2. Fix three broken behaviors in index.tsx (delete, navigation, search filter)
3. Create app/event-details.tsx as a new push screen
4. Register event-details in _layout.tsx Stack.Protected
5. Mount EventsProvider in _layout.tsx (it is currently not mounted — useEvents() throws)
6. Fix CreateEvent to call eventsApi.create() when useApi is true

**Primary recommendation:** Use `app/event-details.tsx` with `useLocalSearchParams<{ id: string }>()` for the Details screen. Navigate from card tap via `router.push('/event-details?id=${event.id}')`.

---

## Standard Stack

### Core (already installed, confirmed in codebase)

| Library | Purpose | Where Used |
|---------|---------|------------|
| Expo Router (file-based) | Navigation between screens | `app/_layout.tsx`, `app/(tabs)/` |
| GlueStack UI | All UI components (no custom primitives) | `components/ui/` |
| NativeWind / Tailwind | Utility class styling | `global.css`, `tailwind.config.js` |
| lucide-react-native | Icons | `index.tsx`, `edit-event.tsx` |
| @gorhom/bottom-sheet | BottomSheet for Create Event | `index.tsx` |
| expo-router `useLocalSearchParams` | Read query params on push screens | `join.tsx` pattern |
| `useSession()` from `app/contexts/AuthContext` | Current user name + role | `profile.tsx` |
| `useEvents()` from `app/contexts/EventsContext` | All event data | `index.tsx`, `edit-event.tsx` |

### GlueStack Components Available for This Phase

| Component | Use Case |
|-----------|----------|
| `Badge` | Status badge (ACTIVE), role badge (ORGANIZER/PARTICIPANT) |
| `Avatar` | Participant initials avatar |
| `Card` | Event card in list, assignment reveal card |
| `Button` | "View All Gifts", "Add My Gifts", "View My Assignment" |
| `Pressable` | Event card tap → navigate to details |
| `FlatList` | Events list |
| `ScrollView` | Details screen body |
| `Input / InputField` | Search bar |
| `AlertDialog` | Delete confirmation |
| `Fab / FabIcon` | Create event FAB button |
| `Spinner` | Loading state |
| `HStack / VStack` | Layout primitives |
| `Divider` | Separator between participants |
| `Icon` | Chevron right, icons |

---

## Architecture Patterns

### Recommended File Structure Changes

```
apps/gatherly-mobile/
  app/
    _layout.tsx            ← ADD: EventsProvider wrap + event-details Stack.Screen
    (tabs)/
      index.tsx            ← MODIFY: rework to match Events.png
    event-details.tsx      ← CREATE: new push screen (Details.png)
  components/
    CreateEvent.tsx        ← MODIFY: call eventsApi.create() when useApi is true
```

### Pattern 1: Push Screen with Query Param (Expo Router)

For the Details screen, use a flat push screen (not a dynamic segment) matching the pattern already used by `edit-event.tsx`.

**File:** `app/event-details.tsx`
**Navigate:** `router.push('/event-details?id=${event.id}')`
**Read param:**
```typescript
// Source: join.tsx existing pattern in codebase
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

**Register in _layout.tsx Stack.Protected:**
```typescript
<Stack.Screen
  name="event-details"
  options={{ headerShown: false }}
/>
```

This matches the existing `edit-event` pattern exactly. Do NOT use `app/event/[id].tsx` dynamic segments — the existing screens use flat query-param navigation.

### Pattern 2: Events List Screen Adaptation

Events.png maps to gatherly as follows:

| Events.png Element | Gatherly Equivalent |
|-------------------|---------------------|
| "Discover Events" header | "My Events" header |
| Notification bell | Keep bell icon (no-op for now) |
| Search bar "Search concerts..." | "Search events..." (wire to filter) |
| Category pills: All / Music / Tech / Social | Status filter pills: All / Planning / Active |
| "Upcoming Events" section + "View All" | Events section (no "View All" needed) |
| Event cards with hero image, name, location/date, pill, Save/Book | Event cards with name, date, people count, gift count, status pill |
| Bottom tab bar | Existing tab bar (Events, Profile) |
| FAB (+) | Keep existing FAB for create event |

Card layout from Events.png:
- Full-width card with subtle image area OR solid color hero (use event name initial / party icon)
- Event name in bold
- Stats row: participant count, gift count
- Status pill (Planning / Active based on assignments presence)
- Tap whole card → navigate to details

### Pattern 3: Details Screen Layout

Exact mapping from Details.png:

```
Back arrow (top-left)          ← router.back()
Three-dot menu (top-right)     ← Menu component (delete action)
Hero image area                ← Solid color bg with event name initial
ACTIVE badge                   ← Badge based on assignments !== null
Event name (large)             ← event.name
Stats: "N Members" | "N Gifts" ← people.length, Object.keys(gifts).length
---
"Your Secret Assignment" card  ← teal/mint bg Card
  Person icon + heading        ← Icon + Text
  "Shh! It's a secret..."     ← Subtext
  "View My Assignment" button  ← Toggle reveal state
  [When revealed: show names]  ← Text with receiver names
---
"Participants" + "Invite Members" link ← Section header with link
  [Avatar | Name | Role badge | Chevron] per participant
---
Bottom action bar:
  "View All Gifts" (outline)   ← router.push('/gifts?id=${event.id}')
  "+ Add My Gifts" (filled)    ← router.push('/gifts?id=${event.id}')
Bottom tab bar
```

### Pattern 4: Assignment Reveal

Use local `useState` toggle — no API call needed. Assignment data is already on the event object.

```typescript
const [assignmentRevealed, setAssignmentRevealed] = useState(false);
const { user } = useSession();

// user.name is the lookup key for assignments
const myAssignment = event.assignments?.[user?.name ?? ''] ?? [];
// myAssignment is string[] of receiver names
```

The "View My Assignment" button text changes to "Hide Assignment" when revealed.
When revealed, show the receiver name(s) inline inside the card.

### Pattern 5: Participant Role Logic

The `users` table has a global `role` field ('organizer' | 'participant'). However, the `participants` table has NO per-event role column. The Details.png shows ORGANIZER / PARTICIPANT role badges per participant.

**Verified from schema:** `participants` table: `id, event_id, name, created_at` — no role column.

**Resolution:** The user's global role (from `user.role` in AuthContext) determines if the current user is an organizer. For the participant list, role badges should be derived from the user's global role:
- If `user.name === participant.name` and `user.role === 'organizer'` → show ORGANIZER badge
- Otherwise → show PARTICIPANT badge

This is the only viable approach given the current schema. There is no per-event organizer concept in the data model.

### Pattern 6: Delete Fix

Current `confirmDelete(id)` ignores the `id` argument and doesn't dispatch.

**Fix:**
```typescript
const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

const confirmDelete = (id: string) => {
  setEventToDeleteId(id);
  setIsDeleteAlertOpen(true);
};

const handleDeleteConfirmed = async () => {
  if (!eventToDeleteId) return;
  if (useApi) {
    await eventsApi.delete(eventToDeleteId);
  }
  dispatch({ type: 'DELETE_EVENT', payload: eventToDeleteId });
  setIsDeleteAlertOpen(false);
  setEventToDeleteId(null);
};
```

The AlertDialog's confirm button calls `handleDeleteConfirmed`.

### Pattern 7: CreateEvent — API vs Local Dispatch

The `CreateEvent` component currently always dispatches locally (even when useApi is true). It does not call `eventsApi.create()`.

**Fix:**
```typescript
// CreateEvent.tsx needs useEvents() for both dispatch AND useApi flag
const { dispatch, useApi } = useEvents();

const handleCreate = async () => {
  if (!eventName.trim()) return;
  if (useApi) {
    const created = await eventsApi.create(eventName.trim());
    dispatch({ type: 'ADD_EVENT', payload: created });
  } else {
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: Date.now().toString(),
        name: eventName.trim(),
        people: [],
        couples: [],
        assignments: null,
        coupleCrossing: false,
        gifts: {},
        date: new Date().toISOString(),
        participants: [],
        description,
      },
    });
  }
  setEventName('');
  setDescription('');
  onClose();
};
```

Note: `eventsApi.create()` is guarded by `requireOrganizer` middleware on the backend — only users with `role: 'organizer'` can create events. When calling create(), add try/catch and show error feedback.

### Pattern 8: EventsProvider Must Be Mounted

**Critical finding:** `EventsProvider` is defined in `app/contexts/EventsContext.tsx` but is NOT mounted anywhere in `app/_layout.tsx`. The `useEvents()` hook will throw "must be used within an EventsProvider" at runtime.

**Fix:** Wrap the `RootLayoutNav` content (inside `GluestackUIProvider`) with `EventsProvider`:

```typescript
// app/_layout.tsx — add import
import { EventsProvider } from './contexts/EventsContext';

// Wrap inside GluestackUIProvider:
<EventsProvider>
  {/* existing Stack content */}
</EventsProvider>
```

Note: There are TWO EventsContext files: `app/contexts/EventsContext.tsx` (used by app screens) and `contexts/EventsContext.tsx` (a separate legacy file that uses `localStorage` — not suitable for React Native). Use only `app/contexts/EventsContext.tsx`.

Also note: `app/contexts/EventsContext.tsx` uses `localStorage` in its initializer — this will silently fail on native (no error, just empty initial state). This is acceptable for Phase 13 since the API path handles the real data. The localStorage fallback is a web-compat remnant.

### Pattern 9: Search Filter Logic

The search input is UI-only with no filter logic. Connect it to derived state:

```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredEvents = useMemo(() =>
  events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  ),
  [events, searchQuery]
);
```

Render `filteredEvents` in FlatList instead of `events`.

### Pattern 10: Navigation Fixes

**Edit-event navigation (currently broken):**
```typescript
// BROKEN:
router.push('/edit-event', {}) // no id passed

// FIX:
router.push(`/edit-event?id=${item.id}`)
```

Note: `edit-event.tsx` reads `route.params.id` via `useRoute` (React Navigation) — but since we're on Expo Router, it should use `useLocalSearchParams`. This is a pre-existing issue; fix the push call to pass id as query param and update edit-event to use `useLocalSearchParams` if needed.

**Details navigation:**
```typescript
// From event card tap:
router.push(`/event-details?id=${item.id}`)
```

**From Details screen:**
```typescript
// View All Gifts / Add My Gifts (future screen — stub for now):
router.push(`/gifts?id=${event.id}`)
// This screen doesn't exist yet — "coming soon" is acceptable
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Participant initials avatar | Custom circle component | GlueStack `Avatar` + `AvatarFallbackText` |
| Status badge | Custom badge view | GlueStack `Badge` + `BadgeText` |
| Delete confirmation dialog | Custom modal | GlueStack `AlertDialog` (already in index.tsx) |
| Bottom action bar | Absolute positioned View | React Native `View` with `position: absolute, bottom: 0` (existing pattern in edit-event.tsx) |
| Role display logic | Complex API | Derive from `user.role` from `useSession()` |
| Assignment lookup | API call | In-memory: `event.assignments?.[user.name]` |

---

## Common Pitfalls

### Pitfall 1: EventsProvider Not Mounted

**What goes wrong:** `useEvents()` throws "must be used within an EventsProvider" — app crashes on Events tab.
**Why it happens:** EventsProvider is never added to `_layout.tsx`.
**How to avoid:** Add `EventsProvider` wrap to `_layout.tsx` before mounting any screen that calls `useEvents()`.
**Warning signs:** Runtime error visible immediately on Events tab load.

### Pitfall 2: confirmDelete Drops the Event ID

**What goes wrong:** Tapping delete on any card sets `isDeleteAlertOpen=true` but `confirmDelete` never stores which event to delete. Confirming the alert has no effect (no dispatch target).
**How to avoid:** Add `eventToDeleteId` state. Set it in `confirmDelete`, clear it in `handleDeleteConfirmed`.

### Pitfall 3: edit-event Receives No ID

**What goes wrong:** `router.push('/edit-event', {})` navigates to edit-event with no params. `route.params.id` is `undefined`. The screen shows "Event not found".
**How to avoid:** Pass id as query param: `router.push('/event-details?id=${item.id}')`.

### Pitfall 4: Two EventsContext Files Exist

**What goes wrong:** Importing from `contexts/EventsContext` (the root-level one) instead of `app/contexts/EventsContext` gives a different context — one that is web-only (localStorage) and uses a different API path.
**How to avoid:** Always import from `@/app/contexts/EventsContext` or `../contexts/EventsContext` relative to files inside `app/`.

### Pitfall 5: event-details Screen Not Registered in _layout.tsx

**What goes wrong:** Navigating to `/event-details` without registering `Stack.Screen name="event-details"` may work in development (Expo Router auto-discovers) but won't be within the `Stack.Protected` guard — unauthenticated users could deep-link to it.
**How to avoid:** Explicitly add `Stack.Screen name="event-details"` inside the `Stack.Protected guard={!!session}` block.

### Pitfall 6: Assignment Reveal When No Assignments Exist

**What goes wrong:** `event.assignments` is `null` when no codes have been generated. `event.assignments[user.name]` throws.
**How to avoid:** Always null-check: `event.assignments?.[user?.name ?? ''] ?? []`. Show "No assignment yet" state when `event.assignments === null`.

### Pitfall 7: Invite Members Route Does Not Exist

**What goes wrong:** "Invite Members" link in Details.png navigates to a screen that hasn't been built yet.
**How to avoid:** Render "Invite Members" as a `Pressable` that shows an inline message or is marked "coming soon" — do NOT navigate to a non-existent route. This is acceptable for Phase 13.

### Pitfall 8: eventsApi.create() Requires Organizer Role

**What goes wrong:** Non-organizer users (role: 'participant') who tap "Create Event" will get a 403 from the backend.
**How to avoid:** Check `user.role === 'organizer'` before showing the Create Event FAB. Show a toast/error if create fails. Alternatively, hide the FAB for participants.

---

## Code Examples

### Details Screen — Core Structure

```typescript
// app/event-details.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from './contexts/EventsContext';
import { useSession } from './contexts/AuthContext';
import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Pressable } from '@/components/ui/pressable';
import { ArrowLeft } from 'lucide-react-native';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state: { events } } = useEvents();
  const { user } = useSession();
  const [assignmentRevealed, setAssignmentRevealed] = useState(false);

  const event = events.find(e => e.id === id);
  if (!event) return <Text>Event not found</Text>;

  const myAssignment = event.assignments?.[user?.name ?? ''] ?? [];
  const hasAssignment = event.assignments !== null;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={22} />
        </Pressable>
        {/* 3-dot menu: delete action */}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero + status */}
        <Badge><BadgeText>{hasAssignment ? 'ACTIVE' : 'PLANNING'}</BadgeText></Badge>
        <Text className="text-3xl font-bold">{event.name}</Text>

        {/* Stats row */}
        <View className="flex-row gap-4">
          <Text>{event.people.length} Members</Text>
          <Text>{Object.keys(event.gifts ?? {}).length} Gifts</Text>
        </View>

        {/* Assignment card */}
        <View className="rounded-2xl bg-teal-100 p-4 mt-4">
          <Text className="font-bold text-lg">Your Secret Assignment</Text>
          {hasAssignment ? (
            <>
              <Text className="text-sm text-slate-600">
                {assignmentRevealed
                  ? `You are buying for: ${myAssignment.join(', ')}`
                  : "Shh! It's a secret. View who you are buying for."}
              </Text>
              <Button onPress={() => setAssignmentRevealed(r => !r)}>
                <ButtonText>
                  {assignmentRevealed ? 'Hide Assignment' : 'View My Assignment'}
                </ButtonText>
              </Button>
            </>
          ) : (
            <Text className="text-sm text-slate-500">
              Assignments haven't been generated yet.
            </Text>
          )}
        </View>

        {/* Participants */}
        <View className="mt-6">
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold">Participants</Text>
            <Text className="text-sm text-slate-400">Invite Members</Text>
          </View>
          {event.people.map(name => (
            <View key={name} className="flex-row items-center py-3 border-b border-slate-100">
              <Avatar size="sm">
                <AvatarFallbackText>{name}</AvatarFallbackText>
              </Avatar>
              <Text className="flex-1 ml-3 font-medium">{name}</Text>
              <Badge>
                <BadgeText>
                  {name === user?.name && user?.role === 'organizer'
                    ? 'ORGANIZER'
                    : 'PARTICIPANT'}
                </BadgeText>
              </Badge>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 p-4 border-t border-slate-100 bg-white">
        <Button variant="outline" className="flex-1">
          <ButtonText>View All Gifts</ButtonText>
        </Button>
        <Button className="flex-1">
          <ButtonText>+ Add My Gifts</ButtonText>
        </Button>
      </View>
    </View>
  );
}
```

### Events List — Filter Logic

```typescript
// index.tsx
const [searchQuery, setSearchQuery] = useState('');

const filteredEvents = useMemo(() =>
  events.filter(e =>
    searchQuery.trim() === '' ||
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  ),
  [events, searchQuery]
);
```

### Delete Pattern Fix

```typescript
const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

const confirmDelete = (id: string) => {
  setEventToDeleteId(id);
  setIsDeleteAlertOpen(true);
};

const handleDeleteConfirmed = async () => {
  if (!eventToDeleteId) return;
  try {
    if (useApi) await eventsApi.delete(eventToDeleteId);
    dispatch({ type: 'DELETE_EVENT', payload: eventToDeleteId });
  } catch (err) {
    console.error('Delete failed:', err);
  }
  setIsDeleteAlertOpen(false);
  setEventToDeleteId(null);
};
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Dynamic route `app/event/[id].tsx` | Flat screen `app/event-details.tsx` + query param | Matches existing pattern in codebase (edit-event.tsx) |
| Global assignment lookup via decipher API | In-memory: `event.assignments[user.name]` | No network call needed — data already loaded |

---

## Open Questions

1. **"View All Gifts" and "Add My Gifts" navigation target**
   - What we know: No `/gifts` screen exists yet
   - What's unclear: Phase 14+ scope for gifts screen
   - Recommendation: Stub both buttons to show a Toast "Coming soon" or navigate to `/gifts?id=X` which shows a placeholder screen, consistent with how `join.tsx` stubs future phases

2. **Gift count display in Details stats row**
   - What we know: `event.gifts` is `Record<string, any>` — populated by getById but empty in getAll
   - What's unclear: `Object.keys(event.gifts).length` may always be 0 on the list screen since getAll returns `gifts: {}`
   - Recommendation: Show gift count from `Object.keys(event.gifts ?? {}).length` on Details (which uses getById data if fetched separately), or use `wishlists?.length` as a proxy on the list

3. **Hero image area for event cards**
   - What we know: Events.png shows photo hero images; gatherly events have no images
   - What's unclear: Whether to use a placeholder color, pattern, or event name initial
   - Recommendation: Use a solid color accent block with the first letter of the event name and a party icon — no image needed

4. **EventsContext localStorage initializer on native**
   - What we know: `localStorage.getItem` always returns null on React Native
   - What's unclear: Whether this causes a silent error or throws
   - Recommendation: It silently returns null (no crash); the API path handles real data load. Leave as-is for Phase 13.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `apps/gatherly-mobile/app/(tabs)/index.tsx` — existing Events list screen, all bugs identified
- `apps/gatherly-mobile/app/edit-event.tsx` — navigation pattern for push screens
- `apps/gatherly-mobile/app/_layout.tsx` — Stack.Protected structure, missing EventsProvider confirmed
- `apps/gatherly-mobile/app/contexts/EventsContext.tsx` — reducer, dispatch types, useApi flag
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — user shape: `{ id, name, email, role }`
- `apps/gatherly-mobile/app/api/events.ts` — TEvent type, eventsApi methods, return shapes
- `apps/gatherly-mobile/app/api/auth.ts` — User type: `{ id, email, name, role: 'organizer' | 'participant' }`
- `apps/gatherly-mobile/components/CreateEvent.tsx` — local-only dispatch, missing API call
- `apps/gatherly-mobile/screen-templates/Events.png` — template visually confirmed
- `apps/gatherly-mobile/screen-templates/Details.png` — template visually confirmed
- `apps/api/src/db/schema.sql` — participants table has no role column confirmed
- `apps/api/src/routes/events.ts` — API response shapes confirmed
- `apps/api/src/routes/invites.ts` — invite flow: organizer-only, no current mobile screen

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and in use
- Architecture (file structure): HIGH — matches existing push-screen pattern in codebase
- Assignment reveal logic: HIGH — TEvent type and assignments shape confirmed
- Participant role logic: HIGH — schema verified, no per-event role column exists
- Pitfalls (EventsProvider, delete bug, navigation bug): HIGH — confirmed by reading actual code
- "View All Gifts" navigation target: LOW — future screen not yet planned

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable codebase, 30 days)
