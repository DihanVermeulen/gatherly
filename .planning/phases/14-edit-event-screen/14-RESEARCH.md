# Phase 14: Edit Event Screen - Research

**Researched:** 2026-02-25
**Domain:** React Native / Expo Router — event management screen with participant invite modal, exclusions sub-screen, assignment generation, and secret code display
**Confidence:** HIGH

## Summary

Phase 14 completes the Edit Event screen for the mobile app. A partially-implemented `edit-event.tsx` already exists but is missing the critical features: the invite modal (with QR code, copyable link, native share), the Manage Exclusions sub-screen, the generate button with loading/error states, and proper API wiring. The screen must match the Edit.png template exactly.

The standard approach is: complete `edit-event.tsx` using the established mobile patterns (GlueStack UI, TanStack Query mutations, `useLocalSearchParams` for Expo Router), port the invite modal from the web's `invites.tsx`, add a new `manage-exclusions.tsx` screen pushed via `router.push`, and add an `invitesApi` module in `app/api/`. Two libraries need installation: `react-qr-code` (QR display in modal) and React Native's built-in `Share` API covers the native share sheet — no additional package needed.

The existing `edit-event.tsx` uses `useNavigation`/`useRoute` (React Navigation) but the rest of the app has migrated to Expo Router's `useLocalSearchParams`/`useRouter`. The screen needs to be refactored to Expo Router as well. The `EventsContext` dispatch pattern maps `UPDATE_EVENT` to `useUpdateEvent` mutation, so saving event state flows through that path. For generate/add-participant/add-couple, direct `eventsApi` calls are needed (not through context dispatch) since those operations do not map to `UPDATE_EVENT`.

**Primary recommendation:** Complete `edit-event.tsx` to match Edit.png. Add `app/manage-exclusions.tsx`, add `app/api/invites.ts`. Wire all actions to backend API. Use `react-qr-code` with `react-native-svg` (already installed) for QR display in the invite modal.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GlueStack UI | (already installed) | All UI components: Modal, Switch, Spinner, Pressable, Text | Project standard — TMPL-03 requires it |
| `expo-router` | ~6.0.4 (installed) | Navigation — `useLocalSearchParams`, `useRouter`, `router.push` | Project standard for all screens |
| `@tanstack/react-query` | (installed via EventsContext) | Query invalidation after mutations | Already used by mutations hooks |
| `expo-clipboard` | ^8.0.8 (installed) | Copy invite link and secret codes | Already used in existing edit-event.tsx |
| `react-qr-code` | ^2.0.15 | QR code display — works with React Native via react-native-svg | Same library as web app; `react-native-svg` already installed |
| React Native `Share` | built-in | Native share sheet for invite URL | No install needed; covers the "native share sheet" decision |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react-native` | ^0.510.0 (installed) | Icons (Eye, EyeOff, Copy, Check, Plus, X, ChevronRight, Dices) | Same icons as web app |
| `react-native-svg` | 15.12.1 (installed) | Peer dep for react-qr-code in RN | Required for QR code rendering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-qr-code` | `react-native-qrcode-svg` | react-qr-code is already used in web app and works in RN with react-native-svg; consistent choice |
| React Native `Share` | `expo-sharing` | expo-sharing is for files/URIs, not text/URLs. RN's built-in `Share.share({ message, url })` is the right tool for sharing an invite link as text |

**Installation:**
```bash
# Run from apps/gatherly-mobile (use npm per project convention)
npm install react-qr-code
```
Note: `react-native-svg` is already installed (15.12.1). No pod install needed since this is Expo managed workflow.

## Architecture Patterns

### Recommended File Structure
```
apps/gatherly-mobile/
├── app/
│   ├── edit-event.tsx          # Main screen — complete this
│   ├── manage-exclusions.tsx   # New sub-screen — pushed from edit-event
│   └── api/
│       ├── invites.ts          # New — invites API module
│       └── events.ts           # Already has addParticipant, removeParticipant, addCouple, removeCouple, generateAssignments, getCodes
├── _layout.tsx                 # Add manage-exclusions Stack.Screen entry
```

### Pattern 1: Expo Router Navigation (use this, NOT useNavigation/useRoute)
**What:** The existing `edit-event.tsx` incorrectly uses `@react-navigation/native`. All other screens use Expo Router.
**When to use:** Always — replace `useRoute` with `useLocalSearchParams`, replace `useNavigation`/`navigation.goBack()` with `useRouter`/`router.back()`.
**Example:**
```typescript
// Source: apps/gatherly-mobile/app/event-details.tsx
import { useLocalSearchParams, useRouter } from "expo-router";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // router.back(), router.push("/manage-exclusions")
}
```

### Pattern 2: GlueStack Modal for Invite
**What:** Modal opens immediately on "+ Add Participant" tap. Calls `invitesApi.createInvite()` on open. Displays QR code + copyable link + email + native share button.
**When to use:** Per CONTEXT.md decision — modal, not inline input, not navigation.
**Example:**
```typescript
// Source: apps/gatherly-mobile/components/ui/modal/index.tsx
import {
  Modal, ModalBackdrop, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
} from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

// isOpen state controls Modal
<Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} size="lg">
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Text className="font-bold text-lg">Invite Participant</Text>
      <ModalCloseButton>
        <X size={20} />
      </ModalCloseButton>
    </ModalHeader>
    <ModalBody>
      {/* QR code, copy link, email input, share button */}
    </ModalBody>
  </ModalContent>
</Modal>
```

### Pattern 3: QR Code in Modal
**What:** Use `react-qr-code` which renders via react-native-svg (already installed).
**When to use:** Inside the invite modal body.
**Example:**
```typescript
// Source: apps/gatherly/src/components/invite/InviteQRCode.tsx (web reference)
import QRCode from "react-qr-code";

<QRCode
  value={inviteUrl}
  size={200}
  level="M"
/>
```
Note: The import is `from "react-qr-code"` — the default export is `QRCode` (not `QRCodeSVG` as in the web app's named import).

### Pattern 4: Native Share Sheet
**What:** React Native's built-in `Share` API — no extra package.
**When to use:** Share button in invite modal.
**Example:**
```typescript
// Source: React Native official docs
import { Share } from "react-native";

const handleShare = async (inviteUrl: string) => {
  await Share.share({
    message: `Join my Gatherly event: ${inviteUrl}`,
    url: inviteUrl, // iOS only — shows URL separately
  });
};
```

### Pattern 5: Direct API Calls for Granular Operations
**What:** For participant add/remove, couple add/remove, generate — call `eventsApi.*` directly and invalidate the `["events"]` query. Do NOT go through `dispatch({ type: "UPDATE_EVENT" })` because those granular endpoints exist and are the right layer.
**When to use:** Add Participant (after invite accepted), Remove Participant, Manage Exclusions create/delete, Generate.
**Example:**
```typescript
// Source: apps/gatherly-mobile/hooks/useEventMutations.ts (pattern reference)
import { useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/app/api/events";

const queryClient = useQueryClient();

const handleGenerate = async () => {
  setGenerating(true);
  setGenerateError(null);
  try {
    await eventsApi.generateAssignments(id, giftCount);
    await queryClient.invalidateQueries({ queryKey: ["events"] });
  } catch (err: any) {
    setGenerateError(err.response?.data?.error || "Could not generate assignments.");
  } finally {
    setGenerating(false);
  }
};
```

### Pattern 6: Partner Exclusions Toggle (Switch component)
**What:** GlueStack `Switch` component — maps to `coupleCrossing` field. ON = allow couples to buy for each other. Must persist to API via `eventsApi.update()`.
**Example:**
```typescript
// Source: apps/gatherly-mobile/components/ui/switch/index.tsx
import { Switch } from "@/components/ui/switch";

<Switch
  value={coupleCrossing}
  onValueChange={(val) => {
    setCoupleCrossing(val);
    // Persist via eventsApi.update(id, { coupleCrossing: val }) + invalidate
  }}
  trackColor={{ false: "#e2e8f0", true: "#14b8a6" }}
/>
```

### Pattern 7: Manage Exclusions Sub-screen
**What:** New screen at `app/manage-exclusions.tsx`. Receives `eventId` as param. Tap-to-select-pair pattern ported from web's inline couple creation (see `selectedCouples` + `firstPersonSelected` state in `apps/gatherly/src/pages/events/edit.tsx`). Uses `eventsApi.addCouple()` and `eventsApi.removeCouple()`.
**When to use:** Pushed via `router.push({ pathname: "/manage-exclusions", params: { id } })` from Edit screen.

The screen needs to be registered in `_layout.tsx`:
```typescript
// In apps/gatherly-mobile/app/_layout.tsx Stack block
<Stack.Screen
  name="manage-exclusions"
  options={{ headerShown: false }}
/>
```

### Pattern 8: Secret Codes — Masked by Default
**What:** Codes hidden with "••••••••" until eye icon pressed. Copy icon copies the base64 code string. Per CONTEXT.md: codes hidden by default, eye per row reveals, copy copies code only.
**Example:**
```typescript
// Source: existing edit-event.tsx (this pattern is already correct)
const generateCode = (person: string, assignments: Record<string, string[]>) =>
  btoa(`${person}:${assignments[person].join(",")}`);

const revealed = revealedCodes[code];
<Text className="font-mono text-xs text-slate-400">
  {revealed ? code : "••••••••"}
</Text>
```

### Pattern 9: Invites API Module
**What:** New `app/api/invites.ts` following the same structure as `app/api/gifts.ts`. Uses `apiClient` from `app/api/client.ts`.
**Example:**
```typescript
// Pattern: apps/gatherly-mobile/app/api/gifts.ts
import apiClient from "./client";

export type Invite = {
  id: number;
  event_id: number;
  invite_code: string;
  invite_url: string;
  email: string | null;
  status: "pending" | "accepted" | "declined";
  participant_name: string | null;
  expires_at: string | null;
  created_at: string;
};

export const invitesApi = {
  createInvite: async (
    eventId: number,
    opts?: { email?: string }
  ): Promise<Invite> => {
    const response = await apiClient.post(`/events/${eventId}/invites`, opts || {});
    return response.data;
  },
  getInvites: async (eventId: number): Promise<{ invites: Invite[] }> => {
    const response = await apiClient.get(`/events/${eventId}/invites`);
    return response.data;
  },
};
```

### Edit.png Layout — Visual Structure
From the template:
1. **Header**: back arrow + event name (centered)
2. **Participants section**: chip row with avatar initials + "x" remove, "+ Add Participant" dashed-border button below
3. **Wishlists Status section**: card per participant showing name + READY/PENDING badge + list icon
4. **Event Settings & Rules card**:
   - "Gifts Per Person" row: label + minus/number/plus stepper
   - "Partner Exclusions" row: label + Switch (teal when on)
   - "Manage Exclusions" row: icon + label + count label + chevron right
5. **Generate Secret Codes button**: full-width teal/primary rounded button with dice icon
   - Subtitle text below: "Clicking generate will assign pairings and lock the participant list..."
6. **Secret Access Codes section** (post-generation): header with "NEW" badge + list of participant rows: NAME (all caps) / code (masked) + eye icon + copy icon

### Anti-Patterns to Avoid
- **Using `useNavigation`/`useRoute`**: The existing screen uses these but they are wrong for Expo Router. Replace with `useLocalSearchParams`/`useRouter`.
- **Assignment generation on client**: The web app does generation client-side, but the mobile app should use `POST /api/events/:id/generate` — the backend endpoint already implements the same algorithm and returns `{ assignments }`.
- **Going through `dispatch({ type: "UPDATE_EVENT" })` for granular ops**: Participant add/remove and couple add/remove have dedicated API endpoints. Use them and invalidate the query cache.
- **Using `expo-sharing` for the share sheet**: That library is for files. Use React Native's `Share` from `"react-native"` for sharing text/URLs.
- **Generating assignments more than once**: Per CONTEXT.md, once generated the list is locked — no re-generate button shown after first generation. Check `event.assignments !== null` to gate the button.

## Backend API Endpoints

All confirmed from `apps/api/src/routes/` source code:

### Invites (from `invites.ts`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/events/:eventId/invites` | JWT + organizer | Create invite — returns `{ id, invite_code, invite_url, magic_link_url, email, status, ... }` |
| GET | `/events/:eventId/invites` | JWT + organizer | List invites for event |
| DELETE | `/events/:eventId/invites/:inviteId` | JWT + organizer | Revoke invite |

### Participants (from `events.ts`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/events/:id/participants` | JWT + organizer | Add participant `{ name }` — returns `{ success: true }` |
| DELETE | `/api/events/:id/participants/:name` | JWT + organizer | Remove participant by name (URL encoded) |

### Couples (from `events.ts`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/events/:id/couples` | JWT + organizer | Add couple `{ person1, person2 }` |
| DELETE | `/api/events/:id/couples/:coupleId` | JWT + organizer | Remove couple by DB id |

Note: The `removeCouple` API requires the database couple ID (not names). The event data from `eventsApi.getById()` returns `couples` as `[name, name]` arrays without IDs. The `eventsApi.getCodes()` and `GET /api/events/:id` responses have couple data without IDs. **The manage-exclusions screen will need to delete couples by index via `PUT /api/events/:id` (full update) or fetch couple IDs separately.** This is an open question — see below.

### Generate & Codes (from `events.ts`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/events/:id/generate` | JWT + organizer | Generate assignments `{ giftCount }` — returns `{ assignments }`. Errors: 400 if constraints impossible |
| GET | `/api/events/:id/codes` | JWT + organizer | Get all codes — returns `{ assignments, codes }` where codes is `Record<string, string>` (base64) |

### Event Update (full) (from `events.ts`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| PUT | `/api/events/:id` | JWT + organizer | Full sync of `{ name, coupleCrossing, people, couples, assignments }`. Used by `useUpdateEvent` mutation. Couples are passed as `[[name1, name2], ...]` — no IDs needed |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom canvas/SVG drawing | `react-qr-code` | Error correction, sizing, spec compliance |
| Native share sheet | Custom share action sheet UI | `Share.share()` from `"react-native"` | Built-in, free, native OS sheet |
| Assignment generation algorithm | Port web client-side algorithm | `POST /api/events/:id/generate` | Backend endpoint already implements same 2000-attempt algorithm |
| Couple removal by index | Track array index locally | PUT full event with updated couples array | Simplest approach given API shape |
| Code masking animation | Custom animated reveal | Just state toggle, no animation needed | Per CONTEXT.md: Claude's discretion — keep it simple |

**Key insight:** The backend has dedicated endpoints for every operation this screen needs. Use them; do not duplicate logic on the client.

## Common Pitfalls

### Pitfall 1: Couple IDs not exposed in event API
**What goes wrong:** `eventsApi.removeCouple(eventId, coupleId)` requires a DB couple ID, but the events list/detail API returns couples as `[name, name]` pairs with no IDs. Calling `removeCouple` will fail with "Not found".
**Why it happens:** The event GET endpoint's couples query returns `[p1.name, p2.name]` — no couple.id in the response.
**How to avoid:** Use the full-update path: when a couple is removed in Manage Exclusions, update `selectedCouples` state, then call `eventsApi.update(id, { couples: updatedCouples })` — the PUT endpoint replaces all couples atomically using names.
**Warning signs:** 404 on DELETE /couples/:coupleId at runtime.

### Pitfall 2: Using `useNavigation`/`useRoute` instead of Expo Router
**What goes wrong:** Screen compiles but navigation fails — existing edit-event.tsx imports from `@react-navigation/native`.
**Why it happens:** Legacy code in the partially-built screen.
**How to avoid:** Replace with `useLocalSearchParams<{ id: string }>()` and `useRouter()` from `expo-router`. Match pattern in `event-details.tsx`.
**Warning signs:** TypeScript errors on `route.params` shape or navigation stack mismatch.

### Pitfall 3: manage-exclusions screen not registered in _layout.tsx
**What goes wrong:** Pushing to "/manage-exclusions" throws "route not found" at runtime.
**Why it happens:** Expo Router uses file-based routing — the screen file must exist AND must be declared in `Stack.Protected` in `_layout.tsx` since it's an authenticated route.
**How to avoid:** Add `<Stack.Screen name="manage-exclusions" options={{ headerShown: false }} />` inside `Stack.Protected guard={!!session}` block.
**Warning signs:** Runtime error "Unmatched Route" when pressing Manage Exclusions.

### Pitfall 4: Invite modal calls API before event ID is available
**What goes wrong:** `invitesApi.createInvite(eventId)` called with undefined/NaN eventId.
**Why it happens:** `id` from `useLocalSearchParams` is a string; need `parseInt(id, 10)` and guard against NaN.
**How to avoid:** Guard `if (!id || isNaN(parseInt(id, 10))) return;` before API call. The event ID in mobile is always a DB integer string (mobile always uses API).
**Warning signs:** 404 from server or NaN passed to parseInt.

### Pitfall 5: react-qr-code import syntax in React Native vs web
**What goes wrong:** Web app uses `import QRCodeSVG from "react-qr-code"` as a named import. In React Native, use the default export.
**Why it happens:** The web app used the named export; the default export is what works in RN.
**How to avoid:** Use `import QRCode from "react-qr-code"` (default import) and render `<QRCode value={url} size={200} />`.
**Warning signs:** "QRCodeSVG is not a function" or blank QR code at runtime.

### Pitfall 6: Assignments not reloaded after generate
**What goes wrong:** Generate button succeeds but codes section doesn't appear.
**Why it happens:** `event.assignments` is read from TanStack Query cache; the generate endpoint only returns `{ assignments }`, not the full event. Need to invalidate the cache.
**How to avoid:** After `eventsApi.generateAssignments()` succeeds, call `queryClient.invalidateQueries({ queryKey: ["events"] })` to force a refetch so the screen re-reads fresh event data with assignments populated.
**Warning signs:** Generate succeeds (no error) but codes section stays hidden.

### Pitfall 7: Assignments locked UI — no re-generate after first generation
**What goes wrong:** Button remains visible after generation, allowing multiple generations.
**Why it happens:** Not gating the button display on `event.assignments !== null`.
**How to avoid:** Per CONTEXT.md decision — once `event.assignments !== null`, hide the Generate button and lock the participant list (remove "x" chips and "+ Add Participant" button).
**Warning signs:** Organizer can re-tap generate after codes are shown.

## Code Examples

### Invite Modal — Create Invite on Open
```typescript
// Source: apps/gatherly/src/pages/events/invites.tsx (ported pattern)
const handleOpenInviteModal = async () => {
  setShowInviteModal(true);
  setInviteLoading(true);
  setInviteError(null);
  try {
    const eventId = parseInt(id, 10);
    const invite = await invitesApi.createInvite(eventId);
    setCurrentInvite(invite);
  } catch (err: any) {
    setInviteError(err.response?.data?.error || "Failed to create invite");
  } finally {
    setInviteLoading(false);
  }
};
```

### QR Code Component (React Native)
```typescript
// Source: react-qr-code README — React Native usage
import QRCode from "react-qr-code";

<QRCode
  value={currentInvite.invite_url}
  size={200}
  level="M"
/>
```

### Native Share
```typescript
// Source: React Native official docs (reactnative.dev/docs/share)
import { Share } from "react-native";

const handleNativeShare = async (inviteUrl: string) => {
  try {
    await Share.share({
      message: `Join my Gatherly event! ${inviteUrl}`,
      url: inviteUrl, // iOS shows URL separately
    });
  } catch (err) {
    console.error("Share failed:", err);
  }
};
```

### Generate with Spinner + Inline Error
```typescript
// Source: apps/gatherly-mobile/components/ui/spinner/index.tsx pattern
import { Spinner } from "@/components/ui/spinner";

const [generating, setGenerating] = useState(false);
const [generateError, setGenerateError] = useState<string | null>(null);

// In JSX:
<Pressable
  onPress={handleGenerate}
  disabled={generating}
  className="w-full bg-teal-500 py-4 rounded-2xl items-center flex-row justify-center gap-2"
>
  {generating ? (
    <Spinner color="white" size="small" />
  ) : (
    <>
      <Dices size={18} color="white" />
      <Text className="text-white font-bold">Generate Secret Codes</Text>
    </>
  )}
</Pressable>
{generateError && (
  <Text className="text-red-500 text-sm text-center mt-2">{generateError}</Text>
)}
```

### Exclusions: Full Update Pattern (avoid removeCouple by ID)
```typescript
// Source: apps/gatherly-mobile/hooks/useEventMutations.ts (pattern)
const handleRemoveCouple = async (indexToRemove: number) => {
  const updatedCouples = selectedCouples.filter((_, i) => i !== indexToRemove);
  setSelectedCouples(updatedCouples);
  try {
    await eventsApi.update(id, { couples: updatedCouples });
    await queryClient.invalidateQueries({ queryKey: ["events"] });
  } catch (err) {
    // Re-add on error
    setSelectedCouples(selectedCouples);
  }
};
```

### Partner Exclusions Toggle (Switch)
```typescript
// Source: apps/gatherly-mobile/components/ui/switch/index.tsx
import { Switch } from "@/components/ui/switch";

<Switch
  value={coupleCrossing}
  onValueChange={async (val) => {
    setCoupleCrossing(val);
    try {
      await eventsApi.update(id, { coupleCrossing: val });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch {
      setCoupleCrossing(!val); // revert on error
    }
  }}
  trackColor={{ false: "#e2e8f0", true: "#14b8a6" }}
/>
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `useNavigation`/`useRoute` in edit-event.tsx | `useLocalSearchParams`/`useRouter` from expo-router | Consistent with all other screens |
| Client-side assignment generation (web) | `POST /api/events/:id/generate` (mobile) | Simpler mobile code; backend handles algorithm |
| Inline couple definition (web) | Separate Manage Exclusions screen (mobile) | Per CONTEXT.md decision |
| Inline text input for participant add (web) | Modal with invite link (mobile) | Per CONTEXT.md decision |

## Open Questions

1. **Wishlists Status section on Edit.png**
   - What we know: Edit.png shows a "Wishlists Status" section with per-participant rows showing READY/PENDING badge. The web `edit.tsx` has this section but it navigates to a separate wishlist page.
   - What's unclear: What determines READY vs PENDING? Is there a wishlist count endpoint? The mobile `TEvent` type has a `wishlists` field but the events list API doesn't populate it.
   - Recommendation: Show "READY" if `event.wishlists?.filter(w => w.participantId === p.id).length > 0`, "PENDING" otherwise. Fetch wishlists for the event on screen load via `eventsApi.getById(id)` which returns the full event with wishlist data, or use a separate wishlist query. If this is complex to determine per-participant, stub it as always "PENDING" for Phase 14 — the wishlist feature is separate from the core event editing functionality.

2. **Participant chips — should "Add Participant" modal auto-add the person to event.people after invite is accepted?**
   - What we know: The invite flow adds participants when the invite is accepted (via the `POST /invites/:code/accept` endpoint). The organizer's Edit screen cannot know when this happens in real-time.
   - What's unclear: Does pressing "Add Participant" immediately add a person to the list, or only after they accept the invite?
   - Recommendation: The modal creates the invite and shows it for sharing. No name is added to the participant list until they accept the invite. The organizer refreshes (or navigates back/forward) to see new participants. This matches the web app behavior.

3. **Couple ID retrieval for Manage Exclusions**
   - What we know: The `DELETE /api/events/:id/couples/:coupleId` endpoint requires a DB couple ID. The events API does not expose couple IDs in its response.
   - What's unclear: Whether to add a new API endpoint or use the full PUT update.
   - Recommendation: Use full PUT update (`eventsApi.update(id, { couples: updatedCouples })`) when removing couples. This avoids needing couple IDs and is safe since the PUT endpoint atomically replaces all couples.

## Sources

### Primary (HIGH confidence)
- Codebase — `apps/gatherly-mobile/app/edit-event.tsx` — existing partial implementation inspected directly
- Codebase — `apps/gatherly-mobile/app/_layout.tsx` — navigation structure and Stack.Protected pattern
- Codebase — `apps/gatherly-mobile/app/api/events.ts` — all API methods confirmed
- Codebase — `apps/gatherly-mobile/app/api/client.ts` — API client pattern
- Codebase — `apps/gatherly-mobile/components/ui/modal/index.tsx` — GlueStack Modal API
- Codebase — `apps/gatherly-mobile/components/ui/switch/index.tsx` — GlueStack Switch API
- Codebase — `apps/gatherly-mobile/components/ui/spinner/index.tsx` — Spinner component
- Codebase — `apps/gatherly-mobile/hooks/useEventMutations.ts` — TanStack Query mutation patterns
- Codebase — `apps/gatherly-mobile/contexts/EventsContext.tsx` — dispatch maps to mutations
- Codebase — `apps/api/src/routes/events.ts` — all event endpoints confirmed
- Codebase — `apps/api/src/routes/invites.ts` — all invite endpoints confirmed
- Codebase — `apps/gatherly/src/pages/events/edit.tsx` — couple logic and code generation to port
- Codebase — `apps/gatherly/src/pages/events/invites.tsx` — invite modal logic to port
- Codebase — `apps/gatherly/src/components/invite/InviteQRCode.tsx` — QR code usage pattern
- Codebase — `apps/gatherly-mobile/screen-templates/Edit.png` — template visually inspected
- Codebase — `apps/gatherly-mobile/package.json` — dependencies confirmed (react-native-svg installed, react-qr-code NOT installed)
- react-qr-code README (WebFetch: github.com/rosskhanas/react-qr-code) — confirmed React Native support via react-native-svg
- React Native Share docs (WebFetch: reactnative.dev/docs/share) — confirmed Share.share() API

### Secondary (MEDIUM confidence)
- Expo Sharing docs (WebFetch: docs.expo.dev/versions/latest/sdk/sharing/) — confirmed expo-sharing is for files, NOT for text/URL sharing; React Native built-in Share is correct

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json and node_modules
- Architecture: HIGH — all source files read directly, no assumptions
- Backend API: HIGH — read directly from routes source
- Pitfalls: HIGH — derived from actual code gaps and API shape
- QR code library: HIGH — README confirmed React Native support

**Research date:** 2026-02-25
**Valid until:** 2026-03-27 (stable dependencies, 30-day window)
