# Phase 6: Wishlist Priority & Polish - Research

**Researched:** 2026-02-20
**Domain:** Drag-and-drop reordering, database sort order, UX polish (empty/error/loading states)
**Confidence:** HIGH (verified via npm registry, official docs, codebase inspection)

## Summary

This phase adds drag-and-drop reordering to personal wishlist items, persists order across sessions, adds UX polish (empty/error/loading states), and ships image compression (TECH-06). Codebase investigation reveals that **TECH-06 (image compression) is already fully implemented** — `browser-image-compression` v2.0.2 is installed, `apps/gatherly/src/core/imageCompression.ts` exists with 800px max width and 80% quality, and it is actively used in `WishlistForm.tsx`. No work is needed there.

The primary new work is drag-and-drop reordering. The standard React 19-compatible library is `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 (peer dep is `react >= 16.8.0`, covering React 19). The newer `@dnd-kit/react` 0.3.2 supports React 18/19 explicitly but is pre-release (0.x semver) — do NOT use it. The `@dnd-kit/core` stable packages are the correct choice.

A critical architectural finding: the current personal wishlist items are rendered in a **horizontal carousel** (`overflow-x-auto` with `hide-scrollbar`). Running dnd-kit drag-and-drop inside a horizontally scrollable container creates a known and documented conflict on iOS touch devices — touch gestures ambiguously trigger either scroll or drag. The standard resolution is to **change the personal wishlist to a vertical list** when drag-to-reorder is enabled. This is required for correct mobile behavior.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable`, add a `sort_order INTEGER` column to the `wishlists` table, add a `PUT /api/events/:eventId/wishlists/reorder` endpoint, change personal wishlist from horizontal carousel to vertical list, and use the existing TanStack Query optimistic update pattern (matching `useWishlistMutations.ts`). Skip image compression — it is already done.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD context, sensors, collision detection | Stable, React 19 compatible (`react >= 16.8.0`), actively maintained, replaces deprecated react-beautiful-dnd |
| @dnd-kit/sortable | 10.0.0 | `useSortable` hook, `SortableContext`, `arrayMove` | Official sortable preset for @dnd-kit/core, handles vertical list sort |
| @dnd-kit/utilities | 3.2.2 | `CSS.Transform.toString()` for smooth drag animation | Required companion to sortable |

### Already Installed (no action needed)
| Library | Version | Status |
|---------|---------|--------|
| browser-image-compression | 2.0.2 | TECH-06 fully implemented — imageCompression.ts with 800px/80% already in WishlistForm |
| @tanstack/react-query | 5.x | Already handles optimistic update pattern for drag mutations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | @dnd-kit/react (0.3.2) | Pre-release, unstable API — avoid until 1.0 |
| @dnd-kit/core | @hello-pangea/dnd | React 19 peer dep NOT officially declared (still `^18.0.0`), would require `--legacy-peer-deps`; use dnd-kit instead |
| @dnd-kit/core | react-beautiful-dnd | Archived Aug 2025, deprecated — do NOT use |
| @dnd-kit/core | pragmatic-drag-and-drop | Atlassian's new library, limited community resources, no React-specific docs |

**Installation:**
```bash
pnpm --filter gatherly add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended File Changes
```
apps/
├── api/src/
│   ├── db/schema.sql                    # Add sort_order column + index
│   └── routes/wishlists.ts              # Add PUT /:eventId/wishlists/reorder endpoint
└── gatherly/src/
    ├── api/
    │   └── wishlists.ts                 # Add reorder() API function
    ├── api/events.ts                    # Add sortOrder field to WishlistItem type
    ├── contexts/EventsContext.tsx       # Add REORDER_WISHLIST_ITEMS action
    ├── hooks/
    │   └── useWishlistMutations.ts      # Add useReorderWishlistItems mutation hook
    └── pages/events/
        └── wishlist.tsx                 # Convert carousel to vertical list with DnD
```

### Pattern 1: Vertical List with Drag Handles (not drag-on-item)

**What:** Personal wishlist items rendered as a vertical list. Each item has a drag handle (grip icon). The `useSortable` hook applies only to the handle, so scroll is unaffected on iOS.

**When to use:** Always for mobile-first sortable lists. The horizontal carousel layout CANNOT coexist with touch drag-to-reorder (see Pitfall 2).

**Why drag handle, not full-card drag:** Setting `touch-action: none` on the entire card prevents scroll on iOS. A drag handle restricts `touch-action: none` to just the grip icon, preserving normal touch scroll on the card area.

```typescript
// Source: https://dndkit.com/api-documentation/sensors/touch
// Pattern: drag handle with delayed activation for touch
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

function SortableWishlistCard({ item, onEdit }: Props) {
  const {
    attributes,
    listeners,       // attach ONLY to drag handle
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle - touch-action: none only here */}
      <button
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none', cursor: 'grab' }}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>
      {/* Card content - normal touch behavior */}
      <WishlistCard item={item} onEdit={onEdit} />
    </div>
  );
}
```

### Pattern 2: DndContext with Sensor Configuration

**What:** Wrap the personal wishlist list in `DndContext` + `SortableContext`. Configure sensors to use `PointerSensor` with activation constraints so accidental scroll gestures don't start a drag.

```typescript
// Source: https://dndkit.com/api-documentation/sensors/pointer
// Source: https://dndkit.com/presets/sortable
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

// Activation constraint: require 8px movement before drag starts
// This prevents accidental drag on tap/scroll
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={personalItems.map(item => item.id)}
    strategy={verticalListSortingStrategy}
  >
    {personalItems.map(item => (
      <SortableWishlistCard key={item.id} item={item} onEdit={handleEdit} />
    ))}
  </SortableContext>
</DndContext>
```

### Pattern 3: Optimistic Reorder with TanStack Query

**What:** On drag end, immediately reorder items in the TanStack Query cache (same pattern as `useClaimWishlistItem`), fire the API mutation in background, rollback on error.

**Why this pattern:** The codebase already uses this exact pattern in `useWishlistMutations.ts`. The planner must match it.

```typescript
// Source: apps/gatherly/src/hooks/useWishlistMutations.ts (existing codebase pattern)
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates

export function useReorderWishlistItems() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { eventId: string; participantId: number; orderedIds: number[] },
    { previous: Event[] | undefined }
  >({
    mutationKey: ['wishlist', 'reorder'],
    mutationFn: ({ eventId, orderedIds }) =>
      wishlistsApi.reorder(eventId, orderedIds),

    onMutate: async ({ eventId, orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previous = queryClient.getQueryData<Event[]>(['events']);

      // Reorder items in cache using new orderedIds array
      queryClient.setQueryData<Event[]>(['events'], (old = []) =>
        old.map((event) => {
          if (event.id !== eventId) return event;
          const reordered = orderedIds
            .map((id) => (event.wishlists || []).find((w) => w.id === id))
            .filter(Boolean) as WishlistItem[];
          return { ...event, wishlists: reordered };
        })
      );
      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['events'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

### Pattern 4: sort_order Database Column

**What:** Add `sort_order INTEGER` to the `wishlists` table. Use sequential integers (1, 2, 3...) per participant. On reorder, call the bulk update endpoint with the new ordered IDs.

**Why integers, not floats:** The wishlist is per-person and typically has 1-20 items. Fractional indexing (Basedash approach) is for trees/graphs with 1000s of items. For a personal wishlist, a simple bulk integer reassignment on each reorder is the correct level of complexity. No precision degradation risk at this scale.

**API endpoint:**
```
PUT /api/events/:eventId/wishlists/reorder
Body: { orderedIds: number[], participantId: number }
Response: { success: true }
```

The endpoint verifies ownership (all IDs belong to `participantId`), then runs a single transaction updating `sort_order` for each item sequentially.

```sql
-- Migration: add sort_order column
ALTER TABLE wishlists
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_wishlists_sort_order
  ON wishlists(event_id, participant_id, sort_order);
```

The `GET /api/events/:eventId/wishlists` endpoint must update its `ORDER BY` clause from `w.created_at DESC` to `w.sort_order ASC, w.created_at DESC` (fallback for items without sort_order set).

### Pattern 5: handleDragEnd — Local State + Mutation

**What:** In `wishlist.tsx`, manage local `orderedItemIds` state for immediate UI response, then fire the mutation.

```typescript
// Source: https://dndkit.com/presets/sortable (arrayMove pattern)
const [orderedIds, setOrderedIds] = useState<number[]>(() =>
  personalItems.map(item => item.id)
);

// Sync when items change from server
useEffect(() => {
  setOrderedIds(personalItems.map(item => item.id));
}, [personalItems.map(i => i.id).join(',')]);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setOrderedIds(prev => {
    const oldIndex = prev.indexOf(active.id as number);
    const newIndex = prev.indexOf(over.id as number);
    const newOrder = arrayMove(prev, oldIndex, newIndex);
    // Fire API mutation with new order
    reorderMutation.mutate({ eventId: eventId!, participantId: parseInt(participantId!), orderedIds: newOrder });
    return newOrder;
  });
};
```

### Anti-Patterns to Avoid

- **Dragging inside horizontal carousel:** On mobile iOS, `overflow-x-auto` + dnd-kit touch drag = scroll/drag conflict. The personal items section MUST become a vertical list.
- **Using @dnd-kit/react (0.x):** Pre-release, API changes without warning. Use `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0.
- **Setting `touch-action: none` on the entire card:** Prevents scroll in the list. Only set it on the drag handle element.
- **Not using `activationConstraint`:** Without `distance: 8`, a normal tap opens the item editor AND starts a drag simultaneously.
- **Fractional indexing for a small list:** Over-engineering for 1-20 items. Simple sequential integers suffice.
- **alert() for errors:** The existing wishlist page uses `alert()` for error handling. Phase 6 should replace these with inline error states (requirement: "error handling provides clear guidance").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop list reordering | Custom touchstart/touchmove handlers | @dnd-kit/core + @dnd-kit/sortable | Handles touch, pointer, keyboard, accessibility, scroll conflict, iOS quirks |
| Array reordering after drop | Custom splice/index logic | `arrayMove` from @dnd-kit/sortable | One import, handles edge cases including same-position drops |
| Drag animation (transform/transition) | Custom CSS animation | `CSS.Transform.toString(transform)` from @dnd-kit/utilities | Matches dnd-kit's internal coordinate system exactly |
| Image compression | Canvas API + FileReader manual implementation | browser-image-compression (already installed) | Already done in imageCompression.ts — zero work needed |

**Key insight:** dnd-kit handles the entire interaction model — pointer capture, touch disambiguation, scroll lock on drag handle, keyboard accessibility, and DragOverlay. Building this manually for iOS requires handling dozens of edge cases across Safari/Chrome/Firefox mobile.

## Common Pitfalls

### Pitfall 1: Touch Scroll vs Drag Conflict in iOS Safari
**What goes wrong:** When dragging items inside a scrollable container (`overflow-x-auto` or `overflow-y-auto`), iOS Safari interprets the initial touch gesture as scroll, preventing drag from starting. Or vice versa — drag starts and scroll is blocked.
**Why it happens:** iOS Safari decides gesture intent at touchstart based on `touch-action` CSS. If the draggable element has `touch-action: none`, all touch behavior is captured by dnd-kit including scroll.
**How to avoid:**
1. Convert horizontal carousel to vertical list (no horizontal scroll in the DnD zone)
2. Use a drag handle element (grip icon) with `touch-action: none` set only on the handle
3. Use `PointerSensor` with `activationConstraint: { distance: 8 }` so quick taps don't start drags
**Warning signs:** Items can't be scrolled past on mobile; or dragging never starts on iOS.

### Pitfall 2: sort_order NULL for Existing Items
**What goes wrong:** After adding the `sort_order` column to an existing table, all existing rows have `NULL` sort_order. The reorder endpoint and the ORDER BY query must handle this gracefully.
**Why it happens:** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` with `DEFAULT 0` will set existing rows to 0, not their natural creation order.
**How to avoid:** After migration, run a backfill to assign sort_order based on created_at per participant:
```sql
UPDATE wishlists w
SET sort_order = subq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY participant_id ORDER BY created_at ASC
  ) AS rn
  FROM wishlists
) subq
WHERE w.id = subq.id;
```
**Warning signs:** All items sort to position 0 after migration, displaying in arbitrary order.

### Pitfall 3: activationConstraint Missing — Tap Opens AND Starts Drag
**What goes wrong:** User taps on a wishlist card to edit it; dnd-kit simultaneously interprets the tap as a drag start, causing a drag ghost to appear momentarily or blocking the edit action.
**Why it happens:** Without `activationConstraint`, any pointer down immediately begins the drag.
**How to avoid:** Use `activationConstraint: { distance: 8 }` — drag only activates after 8px of movement.
**Warning signs:** Edit modal flickers on open; cards appear to "lift" on tap.

### Pitfall 4: SortableContext `items` Array Mismatch
**What goes wrong:** `SortableContext` receives stale or unsorted `items` IDs, causing wrong drop targets or janky animations after a drop.
**Why it happens:** `SortableContext` items prop must always reflect the current sorted order. If using local `orderedIds` state, the array passed to `SortableContext` must come from that local state, not from `personalItems` (which may lag server state).
**How to avoid:** Compute displayed items from `orderedIds` state: `const displayItems = orderedIds.map(id => itemMap[id]).filter(Boolean)`. Pass `orderedIds` to SortableContext.
**Warning signs:** Dropping an item causes it to snap back, then jump to correct position.

### Pitfall 5: alert() for Error Feedback (Existing Tech Debt)
**What goes wrong:** The wishlist page currently uses `alert()` for save/delete errors. Phase 6 requirement states "error handling provides clear guidance." Using alert() is not inline guidance.
**Why it happens:** The current wishlist.tsx uses `alert()` in catch blocks.
**How to avoid:** Replace with inline error state (e.g., a `toast`-style message or inline error banner) in Phase 6.
**Warning signs:** Browser modal blocking UI on API error.

### Pitfall 6: Reorder Endpoint Missing Ownership Verification
**What goes wrong:** The bulk reorder endpoint updates sort_order for IDs passed in the body without verifying they all belong to the requesting participant. A malicious user could reorder another participant's items.
**Why it happens:** Forgetting to join on participant_id when doing bulk updates.
**How to avoid:** In the reorder endpoint, verify ALL provided IDs belong to `participantId` before updating. Use `WHERE id = ANY($1) AND participant_id = $2` pattern.

## Code Examples

### Verified: dnd-kit Sortable Setup
```typescript
// Source: https://dndkit.com/presets/sortable
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sensor config: 8px movement required to start drag (prevents tap-drag confusion)
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

// handleDragEnd (standard pattern)
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  setItems(items => {
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    return arrayMove(items, oldIndex, newIndex);
  });
}
```

### Verified: useSortable Hook on Drag Handle
```typescript
// Source: https://dndkit.com/api-documentation/sensors/touch
// (drag handle pattern — touch-action: none only on grip)
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: item.id });

// Apply to drag handle only, not the whole card
<div
  {...attributes}
  {...listeners}
  style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
>
  <GripVertical />
</div>

// Apply transform/transition to the whole item wrapper
<div
  ref={setNodeRef}
  style={{
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }}
>
```

### Verified: Reorder API Endpoint Pattern (Express)
```typescript
// PUT /api/events/:eventId/wishlists/reorder
router.put(
  '/:eventId/wishlists/reorder',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { orderedIds, participantId } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds required' });
    }

    // Verify all IDs belong to this participant (ownership check)
    const ownerCheck = await query(
      `SELECT COUNT(*) FROM wishlists
       WHERE id = ANY($1) AND participant_id = $2 AND event_id = $3`,
      [orderedIds, participantId, eventId]
    );
    if (parseInt(ownerCheck.rows[0].count) !== orderedIds.length) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Bulk update sort_order in a transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE wishlists SET sort_order = $1 WHERE id = $2',
          [i + 1, orderedIds[i]]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);
```

### Verified: GET endpoint sort_order update
```sql
-- apps/api/src/routes/wishlists.ts GET query
-- Change ORDER BY from:
ORDER BY w.created_at DESC
-- To:
ORDER BY w.sort_order ASC NULLS LAST, w.created_at ASC
```

### Verified: Empty State Pattern (existing codebase style)
```tsx
// Pattern from existing wishlist.tsx registry empty state:
{personalItems.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 px-8">
    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Gift className="w-8 h-8 text-primary/40" />
    </div>
    <h3 className="font-bold text-base mb-1">No items yet</h3>
    <p className="text-sm text-gray-500 text-center mb-4">
      Add gifts to your wishlist so others know what to buy you
    </p>
    <button onClick={handleAdd} className="...">
      Add Your First Gift
    </button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core + @dnd-kit/sortable | Atlassian deprecated rbd in 2022, archived Aug 2025 | Use dnd-kit — rbd is dead |
| @dnd-kit/react (new API) | @dnd-kit/core + @dnd-kit/sortable (stable API) | @dnd-kit/react is 0.3.2, not stable | Use stable core packages until @dnd-kit/react hits 1.0 |
| Fractional/float sort order | Integer sequential sort_order | N/A — both valid | Use integers for small lists (1-20 items); floats for large/nested |
| alert() for errors | Inline error state / toast | Phase 6 requirement | Replace existing alert() calls |

**Deprecated/outdated:**
- `react-beautiful-dnd`: archived, do NOT use
- `@dnd-kit/react` 0.x: pre-release, API unstable, do NOT use for production
- `created_at DESC` ordering in GET wishlists: will be replaced by `sort_order ASC NULLS LAST, created_at ASC`

## Open Questions

1. **Empty state for "Registry" when no other participants have wishlists**
   - What we know: The registry section already has a minimal empty state: `<p className="text-sm text-gray-400">No other wishlists yet</p>`
   - What's unclear: Should this be upgraded to a more visually prominent empty state in Phase 6?
   - Recommendation: Yes — upgrade to the same illustrated empty state pattern as the personal section (icon + heading + subtext). No blocker.

2. **localStorage reorder support**
   - What we know: `useApi` is hardcoded to `true` in EventsContext (TanStack Query always active). The localStorage fallback for wishlists is vestigial.
   - What's unclear: Should reorder persist to localStorage when offline?
   - Recommendation: Since `useApi = true` always, there is no localStorage reorder path to implement. The TanStack Query offlineFirst mode queues the mutation for when connectivity returns. No separate localStorage handling needed.

3. **WishlistItem `sortOrder` field — does WishlistItem type need updating?**
   - What we know: `WishlistItem` type in `apps/gatherly/src/api/events.ts` has no `sortOrder` field. The API currently returns items ordered by `created_at DESC`.
   - What's unclear: Whether to add `sortOrder` to WishlistItem type or just rely on array position after sort.
   - Recommendation: Add `sortOrder?: number` to `WishlistItem`. It will be returned by the API after the schema migration. The frontend sorts by this field to initialize local `orderedIds` state. This field is informational — the actual display order is managed by local `orderedIds` state after first load.

4. **Personal wishlist layout — carousel vs vertical list**
   - What we know: Current layout is horizontal carousel cards (width 176px, `overflow-x-auto`). DnD requires vertical list for correct touch behavior.
   - What's unclear: Whether to keep the carousel for the case when drag is disabled (e.g., for other participants' view in registry section — where carousel might be fine since no DnD is needed).
   - Recommendation: Convert the personal wishlist section to a vertical list layout. The registry section remains unchanged (no DnD there). The visual design of each personal item card should be updated to suit a vertical list (e.g., horizontal card layout like WishlistRegistryItem rather than the tall vertical card).

## Sources

### Primary (HIGH confidence)
- npm registry `@dnd-kit/core` — version 6.3.1, peerDependencies `react >= 16.8.0` (covers React 19)
- npm registry `@dnd-kit/sortable` — version 10.0.0, peerDependencies `@dnd-kit/core >= 6.3.0`
- npm registry `@dnd-kit/react` — version 0.3.2, peerDependencies React 18 or 19 explicitly (but pre-release)
- `apps/gatherly/src/core/imageCompression.ts` — TECH-06 already implemented: `maxWidthOrHeight: 800, initialQuality: 0.8`
- `apps/gatherly/src/components/wishlist/WishlistForm.tsx` — confirms imageCompression actively used
- `apps/gatherly/package.json` — `browser-image-compression` v2.0.2 installed
- `apps/api/src/db/schema.sql` — `wishlists` table has no `sort_order` column; `priority` is text enum (low/medium/high), not integer
- `apps/gatherly/src/hooks/useWishlistMutations.ts` — establishes optimistic update pattern for this codebase
- `apps/gatherly/src/contexts/EventsContext.tsx` — confirms `dispatch` handles wishlist cache updates; no REORDER action exists yet
- https://dndkit.com/api-documentation/sensors/touch — touch sensor delay and `touch-action` guidance
- https://dndkit.com/presets/sortable — SortableContext, useSortable, arrayMove API

### Secondary (MEDIUM confidence)
- https://github.com/atlassian/react-beautiful-dnd/issues/2672 — react-beautiful-dnd officially deprecated, archived Aug 2025
- https://github.com/hello-pangea/dnd/discussions/810 — hello-pangea/dnd does NOT officially declare React 19 peer dep
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates — onMutate/onError optimistic update pattern
- https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience — float vs integer sort_order analysis

### Tertiary (LOW confidence)
- https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react — ecosystem overview (single blog, no official source), but consistent with other verified findings
- github.com/clauderic/dnd-kit/issues/435 — PointerSensor touch conflict; `touch-action: none` workaround confirmed but thread shows nuance for scrollable containers

## Metadata

**Confidence breakdown:**
- TECH-06 image compression already done: HIGH — directly verified in codebase
- Standard stack (@dnd-kit/core + sortable): HIGH — verified npm registry peerDeps
- @dnd-kit/react pre-release: HIGH — 0.x semver is confirmed pre-release
- Architecture (vertical list required): HIGH — known iOS DnD+scroll conflict documented in dnd-kit issues
- sort_order integer approach: HIGH — schema.sql verified (no column exists, must add); integer approach appropriate for list size
- Optimistic update pattern: HIGH — existing useWishlistMutations.ts establishes the exact pattern
- Pitfalls: HIGH — all pitfalls verified against official docs or codebase inspection

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (30 days — dnd-kit is stable, but @dnd-kit/react may hit 1.0 making the stable vs pre-release note obsolete)
