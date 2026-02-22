---
status: complete
phase: 06-wishlist-priority-polish
plan: 03
started: 2026-02-22
completed: 2026-02-22
commit: feat(06-03): vertical dnd wishlist list with drag-to-reorder
---

## What Was Built

Converted the personal wishlist from a horizontal carousel to a vertical drag-and-drop sortable list using @dnd-kit. Installed `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. Created `SortableWishlistCard` wrapper component with grip handle (GripVertical icon), `DndContext` + `SortableContext` with `verticalListSortingStrategy`, and `handleDragEnd` that calls `useReorderWishlistItems` mutation. Replaced swipe-to-delete with an inline Delete button. Added empty state (icon + heading + CTA) and vertical skeleton loading state.

## Files Changed

- `apps/gatherly/src/pages/events/wishlist.tsx` — Main page refactored: carousel → vertical DnD list, SortableWishlistCard added, local orderedIds state for immediate reorder feedback, synced to server via reorder mutation
- `apps/gatherly/package.json` — Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

## Key Decisions

- `touch-action: none` applied only to drag handle element (not full card) to preserve page scroll
- `activationConstraint: { distance: 8 }` on PointerSensor to prevent tap-drag conflicts
- Local `orderedIds` state drives display order for instant drag feedback; server sync is fire-and-update
- Swipe-to-delete removed entirely — conflicts with DnD touch handling

## UAT Results

8/8 tests passed, 0 issues:
1. Vertical list layout — pass
2. Drag handle visible — pass
3. Drag to reorder — pass
4. Reorder persists after refresh — pass
5. Inline delete button — pass
6. Empty state — pass
7. Loading state — pass
8. New item appended at bottom — pass
