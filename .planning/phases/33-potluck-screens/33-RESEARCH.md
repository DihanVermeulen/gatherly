# Phase 33: Potluck Screens - Research

**Researched:** 2026-03-24
**Domain:** React Native / Expo — feature screen set for potluck module (organizer setup + participant list + signup sheet)
**Confidence:** HIGH

## Summary

Phase 33 is a pure mobile frontend phase. The backend API (Phase 30) is already fully implemented and verified: `GET/POST/PUT/DELETE /api/events/:id/potluck/categories` and `GET/POST/DELETE /api/events/:id/potluck/signups` all exist in `apps/api/src/routes/modules.ts`. The database schema (migration `014-phase30-v22.sql`) is deployed with `module_potluck_categories` and `module_potluck_signups` tables. No backend changes are needed.

This phase delivers three screens: **Potluck Setup** (organizer only — configure categories, publish), **Potluck List** (all event members — grouped list with progress bar, claim/withdraw), and **Potluck Signup Sheet** (modal bottom sheet or separate screen — confirm claim with optional note). It also requires adding four new potluck API methods to `app/api/modules.ts` and wiring the potluck card in `event-details.tsx` to route to the new screen instead of the "coming soon" toast.

All UI follows the established project patterns: GlueStack UI components (Text, Button, Pressable, Modal, etc.), inline hex styles (`#0d9488` teal, `#0f766e` pressed), `SafeAreaView` + `ScrollView` layout, `AppHeader` with optional `rightAction`, `useLocalSearchParams` for route params, and `useSession` for organizer detection via `user.participantId === undefined`.

**Primary recommendation:** Implement the three screens as `app/potluck.tsx` (list + signup sheet inline) and `app/potluck-setup.tsx` (organizer setup), matching the polls/rsvp file-per-module pattern. Wire the `event-details.tsx` potluck case to `router.push('/potluck?id=${id}')`.

## Standard Stack

No new packages are needed. All required tools are already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GlueStack UI | in use | Text, Button, Pressable, Modal, Switch, etc. | Project-wide UI system |
| expo-image-picker | ^55.0.9 | Photo library access for food images | Already in package.json |
| expo-linear-gradient | ^55.0.9 | Hero gradients | Already installed |
| expo-router | in use | File-based routing, `useLocalSearchParams` | Project router |
| react-native-safe-area-context | in use | `SafeAreaView` wrapper | Project standard |
| lucide-react-native | in use | Icons (Utensils, Plus, Minus, Check, etc.) | Project icon library |
| @/components/AppHeader | local | Standardised header with back + right action | Project component |

### No new installations needed

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline signup Modal | Separate `/potluck-signup` screen | Screen template shows a full dedicated screen with header; however Modal is equally valid and avoids an extra route |
| expo-image-picker (base64) | URL-based food images | API stores `food_image_url` as TEXT — base64 is fine for small food thumbnails per the project's image convention |

## Architecture Patterns

### Recommended File Structure
```
apps/gatherly-mobile/
├── app/
│   ├── potluck.tsx              # Potluck List screen (all members) + Signup sheet
│   ├── potluck-setup.tsx        # Setup screen (organizer only)
│   └── api/
│       └── modules.ts           # Add potluck type definitions + 4 new API methods
```

### Pattern 1: Module Screen Navigation (from event-details.tsx)

**What:** The `handleModuleTap` switch in `event-details.tsx` currently shows a "coming soon" toast for the potluck case. Replace it with a `router.push`.

**Current code (line 225-235 of event-details.tsx):**
```typescript
case "potluck":
  toast.show({ ... <ToastTitle>Potluck screen coming soon</ToastTitle> });
  break;
```

**Replace with:**
```typescript
case "potluck":
  router.push(`/potluck?id=${id}` as any);
  break;
```

**When to use:** Any time a module activates from the Event Hub.

### Pattern 2: Organizer-vs-Participant Bifurcation

**What:** The project discriminates between organizer and participant using `user.participantId === undefined`. This is used in every module screen (polls.tsx, rsvp.tsx). Apply the same check in potluck screens.

```typescript
// Source: pattern from polls.tsx, rsvp.tsx
const { user } = useSession();
const isOrganizer = user?.participantId === undefined;
```

**When potluck setup is reached:** The `potluck-setup.tsx` screen is organizer-only. If a participant somehow reaches it, show an error or redirect. The simpler approach (matching other screens) is to guard navigation — only the organizer sees the "Setup Potluck" entry point, so the screen itself doesn't need a runtime guard.

### Pattern 3: Potluck List Screen Layout

**What:** From the `Potluck-List.png` template:
- `AppHeader` with title "Potluck List" and optional right action (organizer gets a settings/edit icon)
- Event Readiness progress bar card at the top (total signups / total quantity needed with percentage label)
- Categories grouped by name, each showing: food image thumbnail, category name, suggestion chips as subtitle, claimed slots (avatars/names), unclaimed slots ("Signup" button)
- Claimed slots display participant names (public — not hidden)
- Unclaimed slots show a teal "Signup" button

**Progress bar implementation:**
```typescript
const totalNeeded = categories.reduce((s, c) => s + c.quantity, 0);
const totalSigned = signups.length;
const pct = totalNeeded > 0 ? Math.round((totalSigned / totalNeeded) * 100) : 0;

// Render:
<View style={{ height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
  <View style={{ height: '100%', borderRadius: 4, backgroundColor: '#14b8a6', width: `${pct}%` }} />
</View>
```

### Pattern 4: Potluck Setup Screen

**What:** From the `Potluck-Setup.png` template:
- `AppHeader` with "Setup Potluck" title and "Preview" right action (teal pill button that navigates to potluck list)
- Each category shown as a card with: CATEGORY label, text input for name, quantity stepper (minus/number/plus), food image picker, suggestion chip input
- "+ Add New Category" button at bottom of list
- "Save and Publish" button — calls PUT to update all category statuses to 'active', then calls `modulesApi.setModules` to set potluck module status to 'active'
- Categories start as 'draft'; publishing sets them all to 'active' and changes module status

**Quantity stepper pattern (from rsvp.tsx headcount):**
```typescript
<Pressable onPress={() => setQuantity(Math.max(1, quantity - 1))}
  className="h-10 w-10 rounded-full bg-background-100 items-center justify-center">
  <Minus size={18} color="#374151" />
</Pressable>
<Text className="text-2xl font-bold text-typography-900">{quantity}</Text>
<Pressable onPress={() => setQuantity(quantity + 1)}
  className="h-10 w-10 rounded-full bg-background-100 items-center justify-center">
  <Plus size={18} color="#374151" />
</Pressable>
```

### Pattern 5: Signup Sheet (Modal)

**What:** From `Potluck-Signup.png` template — a full-height confirmation screen (shown as a separate screen, not a bottom sheet) with:
- Food image hero at top
- "SELECTED ITEM" label + category name
- Event name line with participants icon
- Confirmation text
- Optional note TextInput (multiline)
- Teal "Confirm" button
- "Cancel" text link

**Implementation approach:** Use GlueStack `Modal` (size="full") or push to a separate screen. Looking at the template, it appears to be a full-screen push. Using a Modal with `size="lg"` or a dedicated screen both work. **Recommendation: use a GlueStack Modal** to avoid adding another route, keeping the pattern consistent with polls.tsx (which uses Modal for create).

**Slot state computation:** For each category, compute:
```typescript
const signupsForCat = signups.filter(s => s.categoryId === cat.id);
const slots = Array.from({ length: cat.quantity }, (_, i) => ({
  signup: signupsForCat[i] ?? null,
  index: i,
}));
// slot.signup !== null → claimed (show name)
// slot.signup === null → unclaimed (show "Signup" button)
```

### Pattern 6: API Types for Potluck (modules.ts)

**What:** Add types and methods to `app/api/modules.ts`. The API is fully implemented in the backend.

```typescript
// Types to add to app/api/modules.ts
export type TPotluckCategory = {
  id: number;
  eventId: number;
  name: string;
  quantity: number;
  foodImageUrl: string | null;
  suggestionChips: string[];
  status: 'draft' | 'active';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TPotluckSignup = {
  id: number;
  eventId: number;
  categoryId: number;
  participantName: string;
  note: string | null;
  createdAt: string;
};

// Methods to add to modulesApi object:
getPotluckCategories: async (eventId: string): Promise<TPotluckCategory[]>
createPotluckCategory: async (eventId: string, data: {...}): Promise<TPotluckCategory>
updatePotluckCategory: async (eventId, catId, data): Promise<TPotluckCategory>
deletePotluckCategory: async (eventId, catId): Promise<void>
getPotluckSignups: async (eventId: string): Promise<TPotluckSignup[]>
createPotluckSignup: async (eventId, data: { categoryId, participantName, note? }): Promise<TPotluckSignup>
deletePotluckSignup: async (eventId, signupId): Promise<void>
```

### Pattern 7: Plan-Tier Gating (Free Plan)

**What:** The `event-details.tsx` `handleModuleTap` for potluck already guards against inactive modules (if not in `activeModuleTypes`, shows toast). For free-tier events, potluck module will never be active, so it will never route to the potluck screen via the normal path.

However, the potluck-setup screen also needs to handle the case where the organizer reaches it and the plan is free. Show the upgrade prompt from `modules-config.tsx` pattern.

**Check in potluck-setup.tsx:**
```typescript
const event = events.find(e => e.id === id);
const isFree = (event?.planTier ?? 'free') === 'free';

if (isFree) {
  // Render upgrade prompt instead of setup UI
  // Pattern: teal banner from modules-config.tsx
}
```

### Pattern 8: Publish Action

**What:** "Save and Publish" in the setup screen:
1. Save/create all categories via individual POST/PUT calls (or skip if no changes)
2. Bulk-update all category statuses to 'active' via PUT per category
3. Call `modulesApi.setModules` with potluck status 'active' to activate the module

**Note:** The existing `modulesApi.setModules` replaces all modules atomically. The setup screen must preserve other active modules. Load current modules first, then upsert potluck into the set.

### Pattern 9: Participant Name for Signup

**What:** Per the STATE.md decision: `participantName` sourced from the request body. The mobile app must send the user's name in the signup body.

For organizer users: use `user.name` (from session).
For magic-link participants: the participant name is embedded in the JWT or available from session.

```typescript
// From useSession():
const { user } = useSession();
const myName = user?.name ?? user?.participantName ?? 'Anonymous';
// Pass as participantName in the signup body
```

**Verify name source:** Check what the session user object carries for participant users. The `participantId` being set tells you it's a magic-link user, but the name field needs verification.

### Anti-Patterns to Avoid

- **Don't use module status 'draft'/'active' on categories to mean "module is published":** Module publish state lives in `event_modules.status`, not in category status. However, the API's category `status` field IS used for the per-category draft/active lifecycle. Publish = set all categories to 'active' + set module to 'active'.
- **Don't fetch potluck data on every render:** Use `useFocusEffect` (as in `event-details.tsx`) for data that should refresh when returning from other screens. Use `useEffect` for initial load.
- **Don't optimistically remove signups without confirmation:** Withdrawal changes state for everyone — show a confirmation dialog or at minimum handle the 404 case gracefully.
- **Don't ignore the 409 slot_taken race condition:** The API returns `{ error: "slot_taken" }` when the slot fills between the user tapping "Signup" and the POST reaching the server. Show a user-friendly message and refresh the category list.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Food image upload | Custom file system upload | `expo-image-picker` + base64 | Already used in edit-wishlist-item.tsx; project convention is base64 stored as `data:image/jpeg;base64,...` |
| Progress bar | Custom SVG or canvas | Plain `View` with percentage width | Same pattern as wishlists progress in event-details.tsx — simple, already in codebase |
| Slot race guard | Client-side lock | Backend 409 response + UI refresh | Server does SELECT FOR UPDATE; client just handles 409 |
| Quantity stepper | Slider or text input | Plus/Minus Pressable + number display | Pattern established in rsvp.tsx headcount; matches design templates |

**Key insight:** All complex problems (race conditions, auth, plan gating) are solved in the backend. The frontend's job is to display data correctly and handle the error responses gracefully.

## Common Pitfalls

### Pitfall 1: Signup confirmation needs the participant's display name
**What goes wrong:** `participantName` is sent in the request body. If the name is wrong or missing, signups appear with the wrong name in the public list.
**Why it happens:** JWT for magic-link participants carries `participantId` and `participantName` but the session object shape varies. Organizer JWTs have `userId` and `name`.
**How to avoid:** Before building the signup screen, read `useSession()`'s return type and verify what property holds the display name for both user types. Use `user.name` for organizers; check session structure for participant name.
**Warning signs:** Signup appears with "undefined" or "Anonymous" in the list.

### Pitfall 2: Module "active" status vs Category "active" status
**What goes wrong:** Treating category `status = 'active'` as the signal to show the potluck list to participants, when the correct signal is `event_modules.status = 'active'`.
**Why it happens:** The schema has a `status` field on both the module row and each category row.
**How to avoid:** The potluck list screen (`potluck.tsx`) should be accessible only when the potluck module is active in `event_modules`. Use the same guard as other modules: check `activeModuleTypes.has('potluck')` in `event-details.tsx` before routing. Categories with `status = 'draft'` should be hidden from the participant view but visible in the setup screen.
**Warning signs:** Participants see draft categories before the organizer publishes.

### Pitfall 3: Setting modules wipes other active modules
**What goes wrong:** Calling `modulesApi.setModules(id, [{ type: 'potluck', status: 'active' }])` deactivates all other modules because `setModules` is a full replace, not an upsert of one module.
**Why it happens:** `PUT /api/events/:id/modules` replaces all modules for the event.
**How to avoid:** Load current active modules first, then build the merged array before calling `setModules`. This is the same pattern used in `modules-config.tsx` (line 172: `Array.from(newModules).map(...)`).
**Warning signs:** Other modules (polls, rsvp) disappear from event hub after publishing potluck.

### Pitfall 4: Food image base64 size
**What goes wrong:** Large food images inflate request payload and slow down category create/update.
**Why it happens:** `ImagePicker.launchImageLibraryAsync` with `base64: true` returns the full image if quality is not reduced.
**How to avoid:** Use `quality: 0.5` and `aspect: [4, 3]` with `allowsEditing: true` — same as `edit-wishlist-item.tsx`. Consider a lower quality (0.3) for food thumbnails since they are small in the UI.
**Warning signs:** API requests timing out or 413 payload too large errors.

### Pitfall 5: Slot count vs index confusion
**What goes wrong:** Rendering slots by index (0 to quantity-1) and assuming `signups[i]` corresponds to slot `i`.
**Why it happens:** Signups don't have a slot index — they're just rows associated with a category. Multiple signups can exist (quantity > 1) but they aren't ordered to specific "slot numbers".
**How to avoid:** Render `quantity` slots total. Map signups to slots by their order (first signup fills slot 0, etc.). Show a name pill for each claimed slot and a "Signup" button for each unclaimed slot.

### Pitfall 6: Draft categories visible to participants
**What goes wrong:** Calling `GET /api/events/:id/potluck/categories` returns all categories regardless of status. Draft categories should not be shown to non-organizers.
**Why it happens:** The API does not filter by status — it returns all rows.
**How to avoid:** In `potluck.tsx` (the participant list screen), filter out categories with `status === 'draft'` client-side before rendering. Only organizer sees all.

## Code Examples

### Progress Bar (verified pattern from event-details.tsx)
```typescript
// Source: event-details.tsx lines 352-362
<View style={{ height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
  <View
    style={{
      height: '100%',
      borderRadius: 4,
      backgroundColor: '#14b8a6',
      width: `${Math.round((claimedCount / totalCount) * 100)}%`,
    }}
  />
</View>
```

### Image Picker (verified from edit-wishlist-item.tsx)
```typescript
// Source: edit-wishlist-item.tsx lines 58-84
const pickImage = useCallback(async () => {
  const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permResult.granted) {
    Alert.alert('Permission Required', 'Please grant access to your photo library.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
    base64: true,
  });
  if (!result.canceled && result.assets[0]?.base64) {
    setFoodImageUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
  }
}, []);
```

### Organizer Detection (verified from polls.tsx, rsvp.tsx)
```typescript
// Source: polls.tsx line 28
const { user } = useSession();
const isOrganizer = user?.participantId === undefined;
```

### showToast Helper (verified from edit-event.tsx)
```typescript
// Source: edit-event.tsx lines 91-96
import { Platform, ToastAndroid, Alert } from 'react-native';
function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
}
```

### Module auto-save preserving other modules (from modules-config.tsx)
```typescript
// Source: modules-config.tsx lines 171-177
const modulesPayload = Array.from(newModules).map((t) => ({
  type: t,
  status: 'active',
  config: {},
}));
await modulesApi.setModules(id, modulesPayload);
```

### 409 slot_taken handling
```typescript
try {
  await modulesApi.createPotluckSignup(id, { categoryId, participantName: myName, note });
  // refresh signups
} catch (err: any) {
  if (err?.response?.status === 409) {
    showToast('Slot just taken — please try another.');
    await loadPotluckData(); // refresh to show updated state
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A — potluck is a new feature | Full stack: DB + API already done (Phase 30), only mobile screens remain | Phase 30 complete | Phase 33 is purely UI work |

**Note:** The "coming soon" toast in `event-details.tsx` (line 226-234) is a stub to replace in this phase.

## Open Questions

1. **Participant display name source in session**
   - What we know: `user.participantId` is set for magic-link participants; `user.name` is in the session object for organizers
   - What's unclear: Whether `user.name` is populated for magic-link participants or whether a different field (e.g., `user.participantName`) holds their name
   - Recommendation: Read `app/contexts/AuthContext.tsx` at task-time to confirm the session user object shape for participants. The planner should add an investigation step at the start of the signup implementation task.

2. **Food image storage: base64 vs URL**
   - What we know: The schema stores `food_image_url TEXT` — it's intended for a URL string, but the project convention (wishlists) uses base64 data URIs stored in the same type of column
   - What's unclear: Whether the design intends photos to come from a URL (e.g. a stock food photo service) or from the device gallery
   - Recommendation: Use device gallery (expo-image-picker + base64), matching the wishlists pattern. The setup template shows a food photo beside each category — assume local pick.

3. **Publish semantics: bulk category update**
   - What we know: The API has `PUT /api/events/:id/potluck/categories/:catId` for updating one category at a time. There is no bulk update endpoint.
   - What's unclear: Whether "Publish" should update each category's status individually (N API calls) or if a new batch endpoint should be added
   - Recommendation: Call PUT per category in sequence — typically 2-5 categories so the N calls are acceptable. Do not hand-roll a batch endpoint for Phase 33.

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `apps/api/src/routes/modules.ts` (complete potluck API — all routes verified)
- Direct source inspection: `apps/api/src/db/migrations/014-phase30-v22.sql` (complete schema — both tables verified)
- Direct source inspection: `apps/gatherly-mobile/app/polls.tsx` (established module screen pattern)
- Direct source inspection: `apps/gatherly-mobile/app/rsvp.tsx` (organizer/participant bifurcation pattern)
- Direct source inspection: `apps/gatherly-mobile/app/modules-config.tsx` (setModules auto-save pattern, upgrade modal, MODULE_CATALOG)
- Direct source inspection: `apps/gatherly-mobile/app/event-details.tsx` (handleModuleTap, MODULE_CATALOG, module routing)
- Direct source inspection: `apps/gatherly-mobile/app/edit-wishlist-item.tsx` (expo-image-picker usage)
- Direct source inspection: `apps/gatherly-mobile/app/api/modules.ts` (current API client shape)
- Screen templates: `Potluck-List.png`, `Potluck-Setup.png`, `Potluck-Signup.png` (all three templates exist)
- Direct source inspection: `apps/gatherly-mobile/package.json` (expo-image-picker ^55.0.9 confirmed installed)

### Secondary (MEDIUM confidence)
- STATE.md project decisions (potluck API, plan-tier check, participantName body source)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, no new installs needed
- Architecture: HIGH — screen templates exist, API fully implemented and read from source, all patterns taken from existing module screens
- Pitfalls: HIGH — sourced from direct code inspection of the actual implementation plus STATE.md documented decisions

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — no external dependencies changing)
