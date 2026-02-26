# Phase 15: My Wishlist Screen - Research

**Researched:** 2026-02-26
**Domain:** React Native / Expo Router — wishlist CRUD screen with bottom sheet, ActionSheet, image picker, optimistic delete
**Confidence:** HIGH

---

## Summary

Phase 15 adds a wishlist management screen to the gatherly-mobile app. Users view their wishlist items for a specific event, add items via a FAB + bottom sheet (gorhom/bottom-sheet), edit via a full-screen edit route, and delete via long-press ActionSheet + confirmation dialog.

The full API layer is already implemented: `POST/PUT/DELETE /api/events/:eventId/wishlists/:id` with ownership checks exist in `apps/api/src/routes/wishlists.ts`. The mobile-side API wrapper also exists in `apps/gatherly-mobile/app/api/wishlists.ts`. The EventsContext reducer already handles `ADD_WISHLIST_ITEM`, `UPDATE_WISHLIST_ITEM`, `DELETE_WISHLIST_ITEM`, and `SET_WISHLISTS` actions.

The primary work is two new screens (`my-wishlist.tsx` and `edit-wishlist-item.tsx`), a reusable `AddWishlistItem` bottom-sheet component, and a new route registration in `_layout.tsx`.

**Primary recommendation:** Use existing infrastructure — wishlistsApi, EventsContext wishlist actions, GlueStack Actionsheet, gorhom/bottom-sheet — exactly as established in prior phases. Add `expo-image-picker` (not yet installed) for image selection.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gorhom/bottom-sheet | ^5.0.0-alpha.11 | Add-item bottom sheet | Already in use for CreateEvent; locked decision |
| GlueStack Actionsheet | installed | Long-press context menu | Already installed; locked decision |
| GlueStack AlertDialog | installed | Delete confirmation | Same pattern as event delete in index.tsx |
| expo-image-picker | not yet installed | Camera roll / camera image selection | Expo standard; matches base64 pattern already in use |
| lucide-react-native | ^0.510.0 | Icons | Already in use across all screens |
| expo-router | ~6.0.4 | Navigation (full-screen edit screen) | Already in use |
| NativeWind / Tailwind | ^4.2.1 | Styling | Already in use; dynamic hex inline for any dynamic colors |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ActivityIndicator (react-native) | built-in | Save/loading state in bottom sheet | Use instead of ButtonSpinner when not inside GlueStack Button |
| SafeAreaView (react-native-safe-area-context) | ^5.6.1 | Full-screen edit screen | Same as edit-event.tsx |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gorhom/bottom-sheet | GlueStack Actionsheet | Decision locked — gorhom is used for add-item sheet |
| expo-image-picker | react-native-image-picker | expo-image-picker is the Expo-native choice; no additional setup required |

### Installation

```bash
# From apps/gatherly-mobile — must use npm (pnpm disabled for mobile)
npm install expo-image-picker
```

---

## Architecture Patterns

### Recommended File Structure

```
apps/gatherly-mobile/app/
├── my-wishlist.tsx               # New: wishlist list screen
├── edit-wishlist-item.tsx        # New: full-screen edit screen
├── _layout.tsx                   # Updated: register 2 new routes
├── contexts/
│   └── EventsContext.tsx         # Already has wishlist reducer actions
├── api/
│   └── wishlists.ts              # Already complete
└── components/
    └── AddWishlistItem.tsx        # New: bottom-sheet form component
```

### Pattern 1: Screen Entry Point — my-wishlist.tsx

`my-wishlist.tsx` is a flat-file route (same level as `edit-event.tsx`). It receives `?id=<eventId>` via `useLocalSearchParams`. The screen:

1. Derives the event from EventsContext using `events.find((e) => e.id === id)`.
2. Derives the user's wishlist items by filtering `event.wishlists` where `item.participantId === myParticipantId`.
3. Shows a FlatList of WishlistCards (or empty state if no items).
4. FAB opens a gorhom bottom-sheet containing `<AddWishlistItem>`.
5. Long-press on a card opens GlueStack `Actionsheet` with Edit / Delete / Cancel.
6. Delete shows `AlertDialog` confirmation; on confirm, dispatches optimistic delete then calls API; reverts on failure.

**Determining `myParticipantId`:**

The logged-in user's name is `user?.name` from `useSession()`. The event's `participantDetails` array (`[{ id: number; name: string }]`) is returned by `GET /api/events/:id` but NOT by `GET /api/events` (the list endpoint). Therefore `event.participantDetails` is `undefined` in the current EventsContext because events are loaded via `eventsApi.getAll()` which uses the list endpoint.

Two practical options:
- Option A (recommended): Fetch `participantDetails` by calling `eventsApi.getById(id)` on mount in `my-wishlist.tsx` and storing locally, or
- Option B: Pass `participantId` from the navigation entry point (event-details.tsx already knows the event and user).

Option A is cleaner — a single `useEffect` on mount calls `eventsApi.getById(id)` and stores `participantDetails` in local state. Then `myParticipantId = participantDetails.find(p => p.name === user?.name)?.id`.

### Pattern 2: Add Item Bottom Sheet — gorhom/bottom-sheet

Matches the exact pattern in `(tabs)/index.tsx`:

```typescript
// Source: apps/gatherly-mobile/app/(tabs)/index.tsx
const bottomSheetRef = useRef<BottomSheet>(null);
const snapPoints = useMemo(() => ["90%"], []);

<BottomSheet
  ref={bottomSheetRef}
  index={-1}
  snapPoints={snapPoints}
  enablePanDownToClose={true}
  backgroundStyle={{ backgroundColor: "rgb(255, 255, 255)" }}
  handleIndicatorStyle={{ backgroundColor: "rgb(0, 0, 0)" }}
  backdropComponent={(props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  )}
>
  <BottomSheetView style={{ flex: 1 }}>
    <AddWishlistItem onClose={closeBottomSheet} eventId={id} participantId={myParticipantId} />
  </BottomSheetView>
</BottomSheet>
```

The `AddWishlistItem` component:
- Has four fields: item name (required), description (optional), image (optional), priority (segmented control).
- Default priority: `"low"`.
- On save: calls `wishlistsApi.create(...)`, dispatches `ADD_WISHLIST_ITEM`, closes sheet.
- On save loading: shows `ActivityIndicator` (NOT `ButtonSpinner` — pattern from prior phases).

### Pattern 3: Priority Segmented Control

No GlueStack segmented control component exists. Implement with three adjacent `Pressable` buttons sharing a container:

```typescript
// Source: project pattern (NativeWind + Pressable)
type Priority = "low" | "medium" | "high";
const PRIORITIES: Priority[] = ["low", "medium", "high"];

<View className="flex-row rounded-xl border border-outline-200 overflow-hidden">
  {PRIORITIES.map((p) => (
    <Pressable
      key={p}
      onPress={() => setPriority(p)}
      className={`flex-1 py-2.5 items-center ${
        priority === p ? "bg-primary-500" : "bg-background-0"
      }`}
    >
      <Text
        className={`text-sm font-semibold capitalize ${
          priority === p ? "text-white" : "text-typography-600"
        }`}
      >
        {p.charAt(0).toUpperCase() + p.slice(1)}
      </Text>
    </Pressable>
  ))}
</View>
```

### Pattern 4: Long-press ActionSheet (GlueStack)

Matches existing GlueStack Actionsheet component. Uses `isOpen` state gated on selected item:

```typescript
// Source: apps/gatherly-mobile/components/ui/actionsheet/index.tsx
import {
  Actionsheet, ActionsheetContent, ActionsheetItem, ActionsheetItemText,
  ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetBackdrop,
} from "@/components/ui/actionsheet";

const [actionsheetItem, setActionsheetItem] = useState<TWishlistItem | null>(null);

// On WishlistCard long-press:
// setActionsheetItem(item) — opens sheet

<Actionsheet isOpen={actionsheetItem !== null} onClose={() => setActionsheetItem(null)}>
  <ActionsheetBackdrop />
  <ActionsheetContent>
    <ActionsheetDragIndicatorWrapper>
      <ActionsheetDragIndicator />
    </ActionsheetDragIndicatorWrapper>
    <ActionsheetItem onPress={handleEdit}>
      <ActionsheetItemText>Edit</ActionsheetItemText>
    </ActionsheetItem>
    <ActionsheetItem onPress={handleDeletePrompt}>
      <ActionsheetItemText className="text-error-600">Delete</ActionsheetItemText>
    </ActionsheetItem>
    <ActionsheetItem onPress={() => setActionsheetItem(null)}>
      <ActionsheetItemText>Cancel</ActionsheetItemText>
    </ActionsheetItem>
  </ActionsheetContent>
</Actionsheet>
```

### Pattern 5: Optimistic Delete

Follows the `eventToDeleteId` pattern from `(tabs)/index.tsx`:

```typescript
// Source: apps/gatherly-mobile/app/(tabs)/index.tsx pattern applied to wishlist
const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

const handleDeleteConfirmed = async () => {
  if (itemToDeleteId === null) return;
  // Optimistic: remove from UI immediately
  dispatch({ type: "DELETE_WISHLIST_ITEM", payload: { eventId: id, itemId: itemToDeleteId } });
  setIsDeleteAlertOpen(false);
  setItemToDeleteId(null);
  try {
    await wishlistsApi.delete(id, itemToDeleteId, myParticipantId);
  } catch (err) {
    // Revert: reload wishlists from API
    const fresh = await wishlistsApi.getAll(id);
    dispatch({ type: "SET_WISHLISTS", payload: { eventId: id, items: fresh } });
    // Show error toast or inline error message
  }
};
```

### Pattern 6: WishlistCard Component

```typescript
// Source: apps/gatherly-mobile/app/(tabs)/index.tsx (EventCard pattern adapted)
// Elevation via style prop (not NativeWind shadow classes — known limitation)
<Pressable
  onLongPress={() => setActionsheetItem(item)}
  className="mb-3 rounded-2xl overflow-hidden bg-white border border-outline-100"
  style={{ elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
>
  {/* Image header — full width, only if imageUrl exists */}
  {item.imageUrl ? (
    <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
  ) : null}
  {/* Card body */}
  <View className="p-4 flex-row items-center justify-between">
    <Text className="text-base font-semibold text-typography-900 flex-1 mr-2" numberOfLines={2}>
      {item.itemName}
    </Text>
    <Text className="text-sm text-typography-400 capitalize">{item.priority}</Text>
  </View>
</Pressable>
```

### Pattern 7: Full-screen Edit Screen — edit-wishlist-item.tsx

Follows `edit-event.tsx` exactly:
- Route: `/edit-wishlist-item?id=<itemId>&eventId=<eventId>`
- Registered in `_layout.tsx` under `Stack.Protected`.
- Pre-fills from `event.wishlists.find(w => w.id === Number(id))`.
- On save: calls `wishlistsApi.update(...)`, dispatches `UPDATE_WISHLIST_ITEM`, calls `router.back()`.
- Has a back button + title bar (same as edit-event.tsx).
- Image picker for replacing/adding an image.

### Pattern 8: Image Picker (expo-image-picker)

expo-image-picker is NOT yet installed. Install it with `npm install expo-image-picker` from `apps/gatherly-mobile`.

Usage — images are stored as base64 data URLs, matching the existing pattern in gifts:

```typescript
// Source: expo-image-picker docs + existing base64 pattern in codebase
import * as ImagePicker from "expo-image-picker";

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
    base64: true,
  });
  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
    setImageUrl(dataUrl);
  }
};
```

On iOS, expo-image-picker does NOT require explicit permission prompts for camera roll in Expo SDK 51+ (it uses the new limited photos access). Camera access does still require a permission request. Since this is camera roll only (Claude's discretion area), no explicit permission call is needed.

### Anti-Patterns to Avoid

- **Using `ButtonSpinner` in Pressable context** — requires GlueStack Button parent. Use `ActivityIndicator` instead (established project pattern).
- **Dynamic Tailwind className with hex color** — NativeWind cannot use hex at runtime in className. Use inline `style={{ backgroundColor: "#hex" }}` for any dynamic color.
- **Forgetting `participantId` in delete/update API calls** — `wishlistsApi.delete` requires it as a body param; `wishlistsApi.update` requires it in the body for ownership check on the server.
- **Using `event.participantDetails` from EventsContext without fetching** — The list endpoint (`GET /api/events`) does NOT return `participantDetails`. Must call `eventsApi.getById(id)` to get participant IDs.
- **Calling `wishlistsApi.getAll()` instead of filtering EventsContext** — The context already has wishlists embedded if loaded via getById. Prefer context over extra fetch for display, but a fresh fetch on mount is needed because `getAll()` doesn't include wishlists.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Segmented control UI | Custom animated tabs | Three adjacent Pressable in a bordered row | No GlueStack segmented control; simple Pressable row works fine |
| Context menu on long-press | Custom modal | GlueStack Actionsheet | Already installed, animates from bottom, matches design |
| Delete confirmation | Custom modal | GlueStack AlertDialog | Same as event delete — proven pattern |
| Image base64 conversion | Manual FileReader | `expo-image-picker` with `base64: true` option | Returns base64 directly, matches existing gift image pattern |
| Bottom sheet | react-native Modal | gorhom/bottom-sheet | Locked decision; already used for CreateEvent |

**Key insight:** Every building block is already in the project. The phase is assembly, not invention.

---

## Common Pitfalls

### Pitfall 1: Missing participantId for API ownership checks

**What goes wrong:** `wishlistsApi.delete` and `wishlistsApi.update` both require `participantId` in the request body. If the participantId is not looked up correctly, the API returns 403.

**Why it happens:** The authenticated user (from `useSession`) has a numeric `id` (user table row), but the wishlists API expects the `participants` table row ID (separate table). These are different.

**How to avoid:** Always derive `myParticipantId` from `event.participantDetails` (fetched via `eventsApi.getById`), not from `user.id`.

**Warning signs:** API returns 403 "Unauthorized - can only edit your own items" or 403 "Unauthorized - can only delete your own items".

---

### Pitfall 2: `event.wishlists` is undefined on initial load

**What goes wrong:** `eventsApi.getAll()` (the list endpoint) does NOT include wishlist data. `event.wishlists` will be `undefined` or `[]` when the screen first loads.

**Why it happens:** The GET /api/events list query does not join the wishlists table. EventsContext calls `getAll()` on mount.

**How to avoid:** Call `wishlistsApi.getAll(id)` on mount in `my-wishlist.tsx` and dispatch `SET_WISHLISTS` to populate the context. This ensures the list is fresh.

**Warning signs:** Empty wishlist screen even though items exist in the database.

---

### Pitfall 3: gorhom/bottom-sheet with keyboard (text inputs)

**What goes wrong:** When the bottom sheet contains TextInput fields (item name, description), the keyboard can overlap the inputs on Android.

**Why it happens:** gorhom/bottom-sheet requires `BottomSheetTextInput` (from `@gorhom/bottom-sheet`) instead of the standard `TextInput` to correctly handle keyboard avoiding behavior inside a sheet.

**How to avoid:** Use `BottomSheetTextInput` from `@gorhom/bottom-sheet` as a wrapper around GlueStack `InputField`, OR wrap the sheet content in a `KeyboardAvoidingView`. The simplest approach: use `BottomSheetScrollView` from gorhom to make the sheet content scrollable + keyboard-aware.

**Warning signs:** Keyboard covers the input field on Android and cannot be scrolled to.

---

### Pitfall 4: Image size causing API timeouts

**What goes wrong:** Camera photos can be 4-8 MB. Storing as base64 inflates size by ~33%. With a 30-second timeout in `apiClient`, large images may timeout.

**Why it happens:** The API client has `timeout: 30000`. The server allows 50mb body but the mobile connection may be slow.

**How to avoid:** Use `quality: 0.5` in `launchImageLibraryAsync` and set `allowsEditing: true` to crop. This typically keeps images under 500KB as base64 (~700KB encoded). Also add `maxWidth: 800` to the picker options.

**Warning signs:** Wishlist create/update times out when image is selected.

---

### Pitfall 5: Optimistic delete revert requires SET_WISHLISTS

**What goes wrong:** If the DELETE API call fails, the item has already been removed from the UI. The revert must restore the list, not just re-add the single item (which could be out of order).

**How to avoid:** On delete failure, call `wishlistsApi.getAll(id)` and dispatch `SET_WISHLISTS` to fully restore the server state. This is cleaner than trying to re-insert a single item at the right position.

---

## Code Examples

### Verified: wishlistsApi.create call

```typescript
// Source: apps/gatherly-mobile/app/api/wishlists.ts
await wishlistsApi.create(eventId, {
  participantId: myParticipantId,
  itemName: name.trim(),
  description: description || undefined,
  imageUrl: imageUrl || undefined,
  priority: priority,   // "low" | "medium" | "high"
});
```

### Verified: EventsContext dispatch for new item

```typescript
// Source: apps/gatherly-mobile/app/contexts/EventsContext.tsx
dispatch({
  type: "ADD_WISHLIST_ITEM",
  payload: { eventId: id, item: createdItem },
});
// ADD_WISHLIST_ITEM prepends: [action.payload.item, ...(event.wishlists || [])]
// New item automatically appears at the top of the list.
```

### Verified: EventsContext dispatch for delete

```typescript
// Source: apps/gatherly-mobile/app/contexts/EventsContext.tsx
dispatch({
  type: "DELETE_WISHLIST_ITEM",
  payload: { eventId: id, itemId: item.id },
});
// Uses item.id (number) — matches TWishlistItem.id type
```

### Verified: Route registration in _layout.tsx

```typescript
// Source: apps/gatherly-mobile/app/_layout.tsx — pattern
<Stack.Protected guard={!!session}>
  {/* ... existing screens ... */}
  <Stack.Screen name="my-wishlist" options={{ headerShown: false }} />
  <Stack.Screen name="edit-wishlist-item" options={{ headerShown: false }} />
</Stack.Protected>
```

### Verified: Navigation from event-details.tsx

The event-details screen has a stub "Add My Gifts" button. This should navigate to the wishlist screen:

```typescript
// Source: apps/gatherly-mobile/app/event-details.tsx (existing stub)
onPress={() => router.push(`/my-wishlist?id=${event.id}`)}
```

### Verified: TWishlistItem type (frontend)

```typescript
// Source: apps/gatherly-mobile/app/api/events.ts
export type TWishlistItem = {
  id: number;
  eventId: number;
  participantId: number;
  participantName?: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priority: "low" | "medium" | "high";
  claimedBy?: number;
  claimedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};
```

**Note:** The API returns `isClaimed` and `claimedByMe` booleans but these are NOT on the `TWishlistItem` type. Phase 16 will need to extend the type. For Phase 15 (own wishlist only), this is irrelevant.

### Verified: Image component for card image header

```typescript
// Use React Native Image (not GlueStack Image) for base64 data URLs
import { Image } from "react-native";

{item.imageUrl ? (
  <Image
    source={{ uri: item.imageUrl }}
    style={{ width: "100%", height: 160 }}
    resizeMode="cover"
  />
) : null}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| expo-image-picker `MediaTypeOptions.Images` (deprecated) | `mediaTypes: ["images"]` array | Must use array form in SDK 51+ |
| Manual permission request for camera roll | Automatic (iOS limited photos access) | No explicit requestPermissionsAsync needed for camera roll |

---

## Open Questions

1. **TWishlistItem type missing `isClaimed`/`claimedByMe`**
   - What we know: API returns these fields; frontend type does not include them.
   - What's unclear: Whether Phase 15 needs to add them to the type now, or defer to Phase 16.
   - Recommendation: Defer — Phase 15 only shows own items where claimed status is irrelevant. Extend type in Phase 16.

2. **Stub button in event-details.tsx**
   - What we know: "Add My Gifts" (console.log stub) and "View All Gifts" (console.log stub) exist at bottom of event-details.tsx.
   - What's unclear: Whether Phase 15 should wire up "Add My Gifts" → `/my-wishlist`, "View All Gifts" → Phase 16 screen.
   - Recommendation: Wire "Add My Gifts" → `/my-wishlist?id=${event.id}` in this phase. Leave "View All Gifts" as stub (Phase 16).

3. **expo-image-picker permissions on Android**
   - What we know: Android requires explicit `READ_MEDIA_IMAGES` permission for library access.
   - What's unclear: Whether the managed Expo workflow handles this automatically.
   - Recommendation: Call `ImagePicker.requestMediaLibraryPermissionsAsync()` before opening picker, handle denied state with an inline message.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `apps/gatherly-mobile/app/api/wishlists.ts` — full API client with method signatures
- Codebase: `apps/gatherly-mobile/app/contexts/EventsContext.tsx` — all four wishlist reducer actions verified
- Codebase: `apps/gatherly-mobile/app/(tabs)/index.tsx` — FAB + bottom sheet + AlertDialog + optimistic delete patterns
- Codebase: `apps/gatherly-mobile/app/edit-event.tsx` — full-screen edit pattern with SafeAreaView + back button
- Codebase: `apps/api/src/routes/wishlists.ts` — API endpoint signatures and ownership model
- Codebase: `apps/gatherly-mobile/components/ui/actionsheet/index.tsx` — available Actionsheet components
- Codebase: `apps/gatherly-mobile/package.json` — installed dependencies; expo-image-picker NOT present

### Secondary (MEDIUM confidence)

- Expo docs pattern for expo-image-picker with `base64: true` and `mediaTypes: ["images"]` — verified as current SDK 51+ API

### Tertiary (LOW confidence)

- iOS "automatic limited photos access" without explicit permission call — based on Expo SDK 51 behavior description; should be verified during implementation

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all dependencies verified in package.json and source files
- Architecture: HIGH — all patterns verified against existing codebase; wishlist API fully implemented
- Pitfalls: HIGH — derived from observed codebase patterns and API ownership model
- Image picker: MEDIUM — expo-image-picker not installed; API shape based on expo docs knowledge

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable APIs)
