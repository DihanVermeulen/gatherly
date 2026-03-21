# Phase 32: Screen Redesigns - Research

**Researched:** 2026-03-21
**Domain:** React Native / Expo — Screen UI redesign (Event Details Hub, Manage Event, Module Config)
**Confidence:** HIGH

## Summary

Phase 32 redesigns three existing screens to match new design templates. The work is primarily UI — no new API endpoints are required. The backend already exposes all needed fields (`location`, `cover_photo`, `allow_guest_invites`, `is_public`, `hasCoverPhoto`, `coverPhotoUrl`) from the Phase 30 migration. The organizer name for the "Organised by" line comes from `GET /api/users/me` which returns `name`.

The largest new capability is the full-bleed hero with either a cover photo (`Image` from React Native) or a teal gradient fallback. `expo-linear-gradient` is NOT currently installed in gatherly-mobile. The gradient can be implemented using `react-native-svg` `LinearGradient` (already installed and used in the codebase for the logo), or `expo-linear-gradient` can be added. The simpler path uses the GlueStack `image-background` component (backed by React Native's `ImageBackground`) for photo display. For the gradient fallback, a simple `View` with a solid teal colour (`#0d9488` → dark `#0f766e`) using two stacked `View` components simulates the gradient acceptably — or `expo-linear-gradient` can be installed.

The Manage Event screen requires a new sub-screen (`/edit-event-details`) for editing event name, date, location, and cover photo. This sub-screen does not exist yet and must be created. The existing `edit-event.tsx` becomes a pure management screen (guest list, active modules, global settings toggles).

The Module Config screen needs: auto-save on toggle (remove the Save button), `gift_exchange` is now a regular toggleable module (not always-on), two new "coming soon" module types (`photo_gallery`, `expense_splitter`), and a free-tier upgrade banner at the top.

**Primary recommendation:** Build all three screens as targeted rewrites of the existing files (keeping the same file paths). Create one new file: `app/edit-event-details.tsx` for the event details edit sub-screen. No new packages are strictly required if the gradient fallback is done with a solid teal View; install `expo-linear-gradient` only if a true gradient is needed.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native `Image` | bundled with 0.81.5 | Display cover photo from URL | Native, no extra dep |
| react-native `ImageBackground` | bundled | Full-bleed photo behind overlay content | Built-in, used for hero |
| GlueStack `image-background` | @gluestack-ui/core ^3.0.12 | GlueStack wrapper over ImageBackground | Already in project |
| lucide-react-native | ^0.510.0 | All icons (Camera, MapPin, Gear, etc.) | Already in project |
| expo-image-picker | ^55.0.9 | Cover photo picker from camera roll | Already in project |
| react-native-safe-area-context | ^5.6.1 | Safe area for hero that goes behind status bar | Already in project |
| GlueStack Switch | @gluestack-ui/core | Toggle for allow_guest_invites, is_public, modules | Already in project, used in edit-event |

### Gradient Fallback Options
| Approach | Status | Notes |
|----------|--------|-------|
| `expo-linear-gradient` | NOT installed | Cleanest API, requires install with `npm install --ignore-scripts` |
| `react-native-svg LinearGradient` | Already installed | Works but needs SVG wrapper, more verbose |
| Solid teal `View` | No install needed | Acceptable fallback if gradient not required |

**Recommendation for gradient:** Install `expo-linear-gradient`. It is an Expo first-party package, compatible with Expo SDK 54, and provides the cleanest API for the teal-to-dark hero fallback. The team already uses `expo-*` packages extensively.

**Installation (if gradient chosen):**
```bash
npm install --ignore-scripts expo-linear-gradient
```

### New Module Types (frontend-only additions)
| Module | Status | Display |
|--------|--------|---------|
| `photo_gallery` | Coming soon | Show in Module Config with "Coming soon" badge, toggle disabled |
| `expense_splitter` | Coming soon | Show in Module Config with "Coming soon" badge, toggle disabled |

These module types do NOT exist in the backend `PREMIUM_MODULES` or `FREE_MODULES` arrays — they are frontend display only for this phase. The `TEventModule.moduleType` union type must be updated to include them (or leave them as display-only with no DB entry).

## Architecture Patterns

### Recommended File Structure Changes
```
apps/gatherly-mobile/app/
├── event-details.tsx        # REWRITE — Event Hub with full-bleed hero + module cards
├── edit-event.tsx           # REWRITE — Manage Event (compact card + sections)
├── edit-event-details.tsx   # NEW — Edit sub-screen (name, date, location, cover photo)
├── modules-config.tsx       # REWRITE — Auto-save toggles, gift_exchange toggleable
└── api/
    └── events.ts            # UPDATE — Add location, coverPhotoUrl, hasCoverPhoto,
                             #          allowGuestInvites, isPublic to TEvent type
```

### Pattern 1: Full-Bleed Hero with SafeAreaView edges

The hero must extend behind the status bar. The current pattern uses `edges={["bottom"]}` on SafeAreaView, leaving the top unprotected so the hero can bleed up. The back arrow is positioned absolutely over the hero with safe area inset manually.

```typescript
// Source: current event-details.tsx pattern + React Native SafeAreaView docs
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

// SafeAreaView with NO top edge — hero bleeds behind status bar
<SafeAreaView className="flex-1 bg-background-0" edges={["bottom"]}>
  {/* Hero — full bleed, includes top inset as extra padding */}
  <View style={{ height: 220 + insets.top, position: 'relative' }}>
    {/* Photo or gradient fills this View */}
    {/* Back arrow + share icon overlaid absolutely */}
    <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
      {/* ArrowLeft button */}
    </View>
  </View>
</SafeAreaView>
```

**Key insight:** The `useSafeAreaInsets()` hook from `react-native-safe-area-context` provides the top inset value so the back arrow clears the notch/status bar.

### Pattern 2: Cover Photo with Gradient Text Overlay

```typescript
// Source: React Native ImageBackground docs + design template observation
import { ImageBackground, View } from 'react-native';

{event.coverPhotoUrl ? (
  <ImageBackground
    source={{ uri: event.coverPhotoUrl }}
    style={{ height: 220 + insets.top }}
    resizeMode="cover"
  >
    {/* Dark gradient overlay for text legibility — bottom 60% of hero */}
    <View
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '70%',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.65))'
        // Note: React Native does NOT support CSS gradients on View.
        // Use expo-linear-gradient LinearGradient component here instead.
      }}
    />
    {/* Text overlaid at bottom of hero */}
    <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{event.name}</Text>
    </View>
  </ImageBackground>
) : (
  /* Gradient fallback using expo-linear-gradient */
  <LinearGradient
    colors={['#0d9488', '#0f172a']}
    style={{ height: 220 + insets.top }}
  >
    {/* Same overlay text content */}
  </LinearGradient>
)}
```

**IMPORTANT:** React Native `View` does not support CSS `background: linear-gradient`. Use `expo-linear-gradient`'s `LinearGradient` component for both the overlay and the fallback hero.

### Pattern 3: Module Cards with Category Group Headers

From the Details.png template, modules are grouped under category labels (ACTIVITY, COLLABORATION, MEMORIES). Each card has an icon, label, subtitle/status line, and chevron. Locked/greyed cards (Photo Gallery) show visually dimmed with no navigation on press.

```typescript
const MODULE_CATEGORIES = {
  ACTIVITY: ['gift_exchange', 'white_elephant'],
  COLLABORATION: ['potluck', 'polls', 'rsvp'],
  MEMORIES: ['photo_gallery'],
};

// Category header
<Text className="text-xs font-bold uppercase tracking-widest text-typography-400 mb-2 mt-4">
  ACTIVITY
</Text>

// Module card
<Pressable
  onPress={() => !isLocked && navigateToModule(mod)}
  className="rounded-2xl bg-white border border-outline-100 flex-row items-center px-4 py-3 mb-2"
  style={{ opacity: isLocked ? 0.5 : 1 }}
>
  {/* icon, label, status line, chevron */}
</Pressable>
```

### Pattern 4: Auto-Save Toggle for Module Config

Remove the Save button. Each toggle fires the API immediately. Use local optimistic state updates to keep UI responsive:

```typescript
const handleToggle = async (type: string) => {
  // Optimistic update
  setActiveModules(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });
  // Fire API immediately
  try {
    await modulesApi.setModules(id, buildModulesPayload(nextModules));
  } catch {
    // Revert on error
    setActiveModules(prev => /* revert */);
  }
};
```

### Pattern 5: Compact Event Details Card in Manage Event

The Edit.png template shows a compact card with a thumbnail, event name, date, location and a pencil icon. Tapping the pencil navigates to the new `/edit-event-details` screen.

```typescript
<Pressable
  onPress={() => router.push(`/edit-event-details?id=${id}`)}
  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white items-center justify-center"
>
  <Pencil size={14} color="#0d9488" />
</Pressable>
```

### Anti-Patterns to Avoid

- **Passing `coverPhotoUrl` through the event list endpoint:** The list endpoint already returns `hasCoverPhoto: boolean` only. To get the actual URL, either call `GET /api/events/:id` (returns `coverPhotoUrl`) or cache it after fetching individually. Do NOT add `coverPhotoUrl` to the list query (would increase payload size for all events).
- **Using CSS `linear-gradient` on a View:** React Native doesn't support CSS gradients on View backgrounds. Must use `expo-linear-gradient` or SVG.
- **Keeping `alwaysOn: true` for gift_exchange in Module Config:** The context decision is that gift_exchange is now a regular toggleable module. Remove `alwaysOn` flag from MODULE_DEFS.
- **Calling `modulesApi.setModules` with only active modules:** The current implementation only sends active modules; inactive ones are never sent. This may leave old active modules in the DB. Verify the `PUT /api/events/:id/modules` endpoint handles removal correctly — it does a `DO UPDATE` but does NOT delete removed modules. Need to send explicit `status: "inactive"` for toggled-off modules, OR call a DELETE endpoint. Research finding: the current `setModules` does an upsert but doesn't remove rows for modules not in the list. For auto-save, send all known modules with their status to properly sync state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-bleed image with overlay | Custom image + absolute View layers | React Native `ImageBackground` | Built-in, handles resize modes, cross-platform |
| Gradient overlay on photo | Custom SVG or view stacking | `expo-linear-gradient` `LinearGradient` | First-party Expo, handles iOS/Android correctly |
| Image picker for cover photo | Custom file input | `expo-image-picker` | Already installed, handles permissions, returns URI |
| Safe area inset for transparent header | Manual padding calculation | `useSafeAreaInsets()` | Already used in onboarding screens, correct on notch devices |
| Module settings sheet | Custom modal | GlueStack `bottomsheet` or `modal` | Already in components/ui/, consistent UX |

**Key insight:** All primitives needed are already in the project. The only potential new dependency is `expo-linear-gradient` for the hero gradient.

## Common Pitfalls

### Pitfall 1: TEvent type missing Phase 30 fields
**What goes wrong:** TypeScript errors when accessing `event.location`, `event.coverPhotoUrl`, `event.hasCoverPhoto`, `event.allowGuestInvites`, `event.isPublic` because they aren't in the `TEvent` type in `app/api/events.ts`.
**Why it happens:** The API was updated in Phase 30 but the mobile TEvent type was not updated.
**How to avoid:** Update TEvent at the start of Phase 32. The API already returns these fields (confirmed by reading `events.ts` route — line 94-97 in the list endpoint, line 212-215 in the single event endpoint).
**Warning signs:** TypeScript "property does not exist" errors on `event.location` etc.

### Pitfall 2: coverPhotoUrl not available from list endpoint
**What goes wrong:** Event Hub needs to display the cover photo, but the list endpoint (`GET /api/events`) returns only `hasCoverPhoto: boolean`, not the actual URL.
**Why it happens:** This was a deliberate Phase 30 decision to keep list payload small.
**How to avoid:** For the Event Hub screen, fetch the full event via `GET /api/events/:id` which returns `coverPhotoUrl`. The screen already receives the event `id` as a param and can call `eventsApi.getById(id)` on mount to get the cover photo URL. Alternatively, use `hasCoverPhoto` to show a skeleton while the URL loads.
**Warning signs:** Hero always shows gradient even when a photo is set.

### Pitfall 3: expo-linear-gradient not installed
**What goes wrong:** Import of `expo-linear-gradient` throws at runtime or build time.
**Why it happens:** Not in package.json.
**How to avoid:** Run `npm install --ignore-scripts expo-linear-gradient` before using it. Verify it's Expo SDK 54 compatible (it is — expo-linear-gradient 14.x works with Expo SDK 54).
**Warning signs:** Metro bundler error: "Unable to resolve module expo-linear-gradient".

### Pitfall 4: Auto-save module toggle leaves stale active rows in DB
**What goes wrong:** When a module is toggled OFF, the `PUT /api/events/:id/modules` endpoint does an upsert (`INSERT ... ON CONFLICT DO UPDATE`) but doesn't delete the row. If only active modules are sent (current behavior), toggling a module OFF would not remove or deactivate it.
**Why it happens:** The current `handleSave` sends only active modules. Auto-save inherits this bug.
**How to avoid:** When auto-saving, send ALL modules (both active and inactive) with the appropriate `status` field. Example: `{ type: "polls", status: "inactive" }` for a toggled-off premium module. The `PUT` handler already accepts `status` as part of each module object.
**Warning signs:** A module appears toggled OFF in the UI but its content screen is still accessible.

### Pitfall 5: Gift Exchange auto-insert still happens on event create
**What goes wrong:** New events auto-get the gift_exchange module even though it should now start OFF.
**Why it happens:** Line 241-244 in `apps/api/src/routes/events.ts` has the auto-insert logic.
**How to avoid:** Remove those 4 lines as part of this phase. The auto-insert block is clearly commented "Auto-insert gift_exchange module for new events".
**Warning signs:** New events have Gift Exchange active before the organiser configures modules.

### Pitfall 6: Hero image layout on devices with notch/Dynamic Island
**What goes wrong:** Back arrow appears behind the notch/Dynamic Island on iOS.
**Why it happens:** Hero uses `edges={["bottom"]}` on SafeAreaView, so the top is not padded.
**How to avoid:** Use `useSafeAreaInsets().top` to position the back arrow button: `top: insets.top + 8`.
**Warning signs:** Back arrow invisible or clipped on iPhone 14 Pro+.

### Pitfall 7: Organizer name for "Organised by" line
**What goes wrong:** Trying to derive organizer name from the event object — it's not in TEvent.
**Why it happens:** TEvent has no `organizerName` field. The organizer name is in the `users` table.
**How to avoid:** For organizer sessions, `useSession().user.name` is the organizer name — use it directly. For participant sessions, `user.name` is the participant's name. The organizer name can be fetched via `GET /api/users/me` but that returns the CURRENT user's name. To get the event organizer's name for participant views, there is no dedicated endpoint — either add one or skip displaying it for participant sessions (acceptable per context decisions).
**Warning signs:** "Organised by undefined" or API 403 errors.

## Code Examples

### Full-bleed hero with cover photo / gradient fallback

```typescript
// Source: React Native docs + expo-linear-gradient docs
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
const HERO_HEIGHT = 220;

{event.coverPhotoUrl ? (
  <ImageBackground
    source={{ uri: event.coverPhotoUrl }}
    style={{ height: HERO_HEIGHT + insets.top }}
    resizeMode="cover"
  >
    {/* Bottom gradient overlay for text legibility */}
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.7)']}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
    />
    {/* Back button */}
    <Pressable
      style={{ position: 'absolute', top: insets.top + 8, left: 16 }}
      onPress={() => router.back()}
      className="h-10 w-10 rounded-full bg-black/30 items-center justify-center"
    >
      <ArrowLeft size={20} color="white" />
    </Pressable>
    {/* Event info overlay at bottom */}
    <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
      <Text className="text-white font-bold text-2xl">{event.name}</Text>
      {event.eventDate ? (
        <Text className="text-white/80 text-sm mt-0.5">
          {formatDate(event.eventDate)} · {event.location}
        </Text>
      ) : null}
    </View>
  </ImageBackground>
) : (
  <LinearGradient
    colors={['#0d9488', '#0f172a']}
    style={{ height: HERO_HEIGHT + insets.top }}
  >
    {/* Same back button + event info overlaid */}
  </LinearGradient>
)}
```

### Date-based badge (UPCOMING / TODAY / PAST)

```typescript
// Source: existing event-details.tsx countdown logic (adapted)
function getEventBadge(eventDate: string | null): 'UPCOMING' | 'TODAY' | 'PAST' | null {
  if (!eventDate) return null;
  const now = new Date();
  const date = new Date(eventDate);
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'PAST';
  if (diffDays === 0) return 'TODAY';
  return 'UPCOMING';
}

const badge = getEventBadge(event.eventDate);
const badgeStyle = {
  UPCOMING: { bg: '#dcfce7', text: '#15803d' },
  TODAY: { bg: '#fef3c7', text: '#92400e' },
  PAST: { bg: '#f1f5f9', text: '#64748b' },
};
```

### Module card with category grouping

```typescript
// Source: Details.png template analysis
const MODULE_CATEGORY_ORDER = [
  { label: 'ACTIVITY', types: ['gift_exchange', 'white_elephant'] },
  { label: 'COLLABORATION', types: ['potluck', 'polls', 'rsvp'] },
  { label: 'MEMORIES', types: ['photo_gallery'] },
];

{MODULE_CATEGORY_ORDER.map(({ label, types }) => {
  const categoryModules = allModuleDefs.filter(m => types.includes(m.type));
  return (
    <View key={label}>
      <Text className="text-xs font-bold uppercase tracking-widest text-typography-400 mb-2 mt-5">
        {label}
      </Text>
      {categoryModules.map(mod => {
        const isActive = activeModules.has(mod.type);
        const isComingSoon = mod.comingSoon;
        const isLocked = mod.premium && isFree && !isComingSoon;
        return (
          <Pressable
            key={mod.type}
            onPress={() => !isComingSoon && !isLocked && router.push(mod.route)}
            disabled={isComingSoon}
            className="rounded-2xl bg-white border border-outline-100 flex-row items-center px-4 py-3 mb-2"
            style={{ opacity: isComingSoon ? 0.6 : 1 }}
          >
            {/* icon, label, status subtitle, chevron */}
          </Pressable>
        );
      })}
    </View>
  );
})}
```

### Auto-save toggle for Module Config

```typescript
// Source: Phase 32 pattern — replaces the current handleSave + Save button
const ALL_MODULE_TYPES = ['gift_exchange', 'polls', 'rsvp', 'potluck', 'white_elephant'];

const handleToggle = async (type: string, isPremium: boolean) => {
  if (isPremium && isFree) {
    setShowUpgradeModal(true);
    return;
  }
  const willBeActive = !activeModules.has(type);
  // Optimistic update
  setActiveModules(prev => {
    const next = new Set(prev);
    willBeActive ? next.add(type) : next.delete(type);
    return next;
  });
  // Build full payload with all known module types and their new status
  const payload = ALL_MODULE_TYPES.map(t => ({
    type: t,
    status: t === type
      ? (willBeActive ? 'active' : 'inactive')
      : (activeModules.has(t) ? 'active' : 'inactive'),
  }));
  try {
    await modulesApi.setModules(id, payload);
  } catch (err: any) {
    // Revert on error
    setActiveModules(prev => {
      const next = new Set(prev);
      willBeActive ? next.delete(type) : next.add(type);
      return next;
    });
    if (err?.response?.data?.error === 'upgrade_required') {
      setShowUpgradeModal(true);
    }
  }
};
```

### TEvent type additions needed

```typescript
// Source: apps/api/src/routes/events.ts GET / and GET /:id endpoints
export type TEvent = {
  // ... existing fields ...
  // Phase 30 additions (currently missing from mobile TEvent):
  location?: string | null;
  hasCoverPhoto?: boolean;
  coverPhotoUrl?: string | null;   // only returned by GET /:id, not GET /
  allowGuestInvites?: boolean;
  isPublic?: boolean;
  // Phase 25 (already present but TEventModule needs new types):
  planTier?: 'free' | 'standard';
};

// TEventModule moduleType must include new display-only types:
export type TEventModule = {
  // ...
  moduleType: 'gift_exchange' | 'polls' | 'potluck' | 'rsvp' | 'white_elephant' | 'photo_gallery' | 'expense_splitter';
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Colour-block hero (letter avatar) | Full-bleed photo or gradient hero | Phase 32 | Requires `expo-linear-gradient` install |
| Gift Exchange always-on (non-toggleable) | Gift Exchange regular toggleable module | Phase 32 | Remove `alwaysOn: true` + remove API auto-insert |
| Save Modules button | Auto-save on toggle | Phase 32 | Remove `handleSave` + bottom Save button |
| Inline event edit fields | Compact card + separate edit sub-screen | Phase 32 | New `edit-event-details.tsx` file |
| No location display | Location shown in hero subtitle | Phase 32 | Already in DB/API from Phase 30 |

**Deprecated/outdated after Phase 32:**
- `alwaysOn` property in `MODULE_DEFS` (modules-config.tsx) — remove entirely
- `handleSave` + "Save Modules" button (modules-config.tsx) — remove
- `HERO_COLORS` array in event-details.tsx — replaced by cover photo / gradient hero
- Auto-insert of `gift_exchange` in `POST /api/events` (events.ts line 241-244) — remove

## Open Questions

1. **Organizer name for participant views on Event Hub**
   - What we know: The "Organised by [name]" line is in the design template. For organizer sessions, `useSession().user.name` is available. For participant sessions, the organizer name is not in TEvent and there's no dedicated endpoint.
   - What's unclear: Should this line be skipped for participant views, or should we add an `organizerName` field to the event API response?
   - Recommendation: For this phase, show the line only when `user.userId` is set (organizer session) using `user.name`. Hide for participant sessions. If needed, can be added to the API response later.

2. **Module-specific settings gear icon destination**
   - What we know: Context decision says gear icon navigates to "module-specific settings sheet". No such screen or sheet exists yet.
   - What's unclear: Which modules should have a gear/settings option? Only Gift Exchange (to set gift count, couple exclusions)?
   - Recommendation: For Phase 32, the gear icon in the Manage Event active modules list navigates to the existing `/manage-exclusions` screen for gift_exchange, and is hidden/disabled for other modules. Full per-module settings sheet is a future concern.

3. **setModules endpoint with inactive modules**
   - What we know: Current `PUT /api/events/:id/modules` does an upsert and doesn't delete rows. Sending `status: 'inactive'` requires the endpoint to handle that status.
   - What's unclear: Does the API route correctly handle `status: 'inactive'` in the upsert, or does it filter that out?
   - Recommendation: Check the modules route — it accepts `status` as a passthrough from the request body. The upsert sets `status = EXCLUDED.status`, so sending `status: 'inactive'` will correctly mark the module inactive. The `GET /api/events/:id/modules` filter in event-details.tsx already filters by `m.status === 'active'`, so inactive modules won't show. This approach works without API changes.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection:
  - `apps/gatherly-mobile/app/event-details.tsx` — current Event Details screen
  - `apps/gatherly-mobile/app/edit-event.tsx` — current Manage Event screen
  - `apps/gatherly-mobile/app/modules-config.tsx` — current Module Config screen
  - `apps/api/src/routes/events.ts` — API event endpoints (confirmed fields)
  - `apps/api/src/routes/modules.ts` — modules endpoint (confirmed upsert behavior)
  - `apps/api/src/routes/users.ts` — users endpoint (confirmed name field)
  - `apps/api/src/db/migrations/014-phase30-v22.sql` — Phase 30 columns confirmed
  - `apps/gatherly-mobile/package.json` — confirmed installed packages
  - `apps/gatherly-mobile/components/ui/` — confirmed GlueStack components available
- Design templates reviewed:
  - `Details.png` — Event Hub with full-bleed hero, module category cards, Organised by line
  - `Edit.png` — Manage Event with compact card, guest list, active modules, global toggles
  - `ModuleConfig.png` — Customize Your Event with Gift Exchange, Potluck, Expense Splitter, Photo Gallery, Polls

### Secondary (MEDIUM confidence)
- expo-linear-gradient compatibility with Expo SDK 54: consistent with Expo's versioning policy that `expo-linear-gradient` 14.x works with SDK 54. Verify at install time.

### Tertiary (LOW confidence)
- Exact hero height (220pt) — derived from visual analysis of Details.png template, not a spec. Adjust during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json and codebase
- Architecture: HIGH — patterns derived from actual code + API responses verified by reading routes
- Pitfalls: HIGH — all identified by direct code inspection (not speculation)
- expo-linear-gradient version: MEDIUM — SDK compatibility is consistent with Expo policy but not verified by installing

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack, no fast-moving dependencies)
