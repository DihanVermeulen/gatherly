import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Info, Gift, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEvents } from "contexts/EventsContext";
import {
  WishlistForm,
  WishlistCard,
  WishlistRegistryItem,
} from "components/wishlist";
import { wishlistsApi } from "api/wishlists";
import {
  useClaimWishlistItem,
  useUnclaimWishlistItem,
  useReorderWishlistItems,
} from "hooks/useWishlistMutations";
import type { WishlistItem } from "api/events";
import type { WishlistFormData } from "components/wishlist/WishlistForm";

// SortableWishlistCard wraps WishlistCard with DnD drag handle and inline delete
function SortableWishlistCard({
  item,
  onEdit,
  onDelete,
}: {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (item: WishlistItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {/* Drag handle - touch-action: none ONLY on handle, not card */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 p-2 cursor-grab active:cursor-grabbing touch-none text-gray-400"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Card content - full width, tappable for edit */}
      <div className="flex-1 min-w-0">
        <WishlistCard item={item} onEdit={onEdit} />
      </div>

      {/* Inline delete button - replaces swipe-to-delete */}
      <button
        onClick={() => onDelete(item)}
        className="shrink-0 p-2 text-red-400 hover:text-red-600"
        aria-label="Delete item"
      >
        <span className="text-xs font-semibold">Delete</span>
      </button>
    </div>
  );
}

export function WishlistPage() {
  const { eventId, participantId } = useParams<{
    eventId: string;
    participantId: string;
  }>();
  const navigate = useNavigate();
  const { state, dispatch, useApi } = useEvents();

  const claimMutation = useClaimWishlistItem();
  const unclaimMutation = useUnclaimWishlistItem();
  const reorderMutation = useReorderWishlistItems();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for immediate DnD feedback
  const [orderedIds, setOrderedIds] = useState<number[]>([]);

  // DnD sensors — distance:8 prevents tap-drag conflicts
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Find the current event
  const event = state.events.find((e) => e.id === eventId);
  const wishlists = event?.wishlists || [];

  // Load wishlists on mount
  useEffect(() => {
    const loadWishlists = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        if (useApi) {
          const items = await wishlistsApi.getAll(eventId);
          dispatch({ type: "SET_WISHLISTS", payload: { eventId, items } });
        }
      } catch (error) {
        console.error("Failed to load wishlists:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWishlists();
  }, [eventId, useApi]);

  // Filter personal and registry items
  const personalItems = wishlists.filter(
    (w) => w.participantId === parseInt(participantId || "0"),
  );
  const registryItems = wishlists.filter(
    (w) => w.participantId !== parseInt(participantId || "0"),
  );

  // Sync orderedIds when personalItems change from server
  // Use a stable key derived from the set of IDs to avoid infinite loops
  const personalIdsKey = personalItems.map((i) => i.id).join(",");
  useEffect(() => {
    const newIds = personalItems.map((i) => i.id);
    setOrderedIds((prev) => {
      // Only reset if the set of IDs actually changed (items added/removed)
      if (
        prev.length !== newIds.length ||
        !prev.every((id) => newIds.includes(id))
      ) {
        return newIds;
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalIdsKey]);

  // Derive display items from local orderedIds state (for immediate DnD feedback)
  const personalItemMap = new Map(personalItems.map((i) => [i.id, i]));
  const displayPersonalItems = orderedIds
    .map((id) => personalItemMap.get(id))
    .filter(Boolean) as WishlistItem[];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedIds((prev) => {
      const oldIndex = prev.indexOf(active.id as number);
      const newIndex = prev.indexOf(over.id as number);
      const newOrder = arrayMove(prev, oldIndex, newIndex);

      // Fire reorder mutation with new order
      reorderMutation.mutate({
        eventId: eventId!,
        participantId: parseInt(participantId || "0"),
        orderedIds: newOrder,
      });

      return newOrder;
    });
  };

  // Group registry items by participant
  const groupedRegistry = registryItems.reduce(
    (acc, item) => {
      const name = item.participantName || `Participant ${item.participantId}`;
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(item);
      return acc;
    },
    {} as Record<string, WishlistItem[]>,
  );

  // Sort participant names alphabetically
  const sortedParticipantNames = Object.keys(groupedRegistry).sort();

  // Handle form save (create or update)
  const handleSave = async (formData: WishlistFormData) => {
    if (!eventId || !participantId) return;

    try {
      setIsSaving(true);

      const itemData = {
        participantId: parseInt(participantId),
        itemName: formData.itemName,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        productUrl: formData.productUrl || undefined,
        priority: formData.priority,
      };

      if (editingItem) {
        // Update existing item
        if (useApi) {
          const updated = await wishlistsApi.update(
            eventId,
            editingItem.id,
            itemData,
          );
          dispatch({
            type: "UPDATE_WISHLIST_ITEM",
            payload: { eventId, item: updated },
          });
        } else {
          // LocalStorage fallback
          const updated = {
            ...editingItem,
            ...itemData,
            updatedAt: new Date().toISOString(),
          };
          dispatch({
            type: "UPDATE_WISHLIST_ITEM",
            payload: { eventId, item: updated },
          });
        }
      } else {
        // Create new item
        if (useApi) {
          const created = await wishlistsApi.create(eventId, itemData);
          dispatch({
            type: "ADD_WISHLIST_ITEM",
            payload: { eventId, item: created },
          });
        } else {
          // LocalStorage fallback - create with temporary negative ID
          const created: WishlistItem = {
            id: -Date.now(),
            eventId: parseInt(eventId),
            participantId: parseInt(participantId),
            itemName: itemData.itemName,
            description: itemData.description,
            imageUrl: itemData.imageUrl,
            productUrl: itemData.productUrl,
            priority: itemData.priority,
            isClaimed: false,
            claimedByMe: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          dispatch({
            type: "ADD_WISHLIST_ITEM",
            payload: { eventId, item: created },
          });
        }
      }

      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to save wishlist item:", error);
      alert("Failed to save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete with claim warning
  const handleDelete = async (item: WishlistItem) => {
    if (!eventId || !participantId) return;

    // Check if item is claimed
    if (item.isClaimed) {
      const confirmed = window.confirm(
        "Someone has claimed this item. Delete anyway?",
      );
      if (!confirmed) return;
    }

    try {
      if (useApi) {
        await wishlistsApi.delete(eventId, item.id, parseInt(participantId));
      }
      dispatch({
        type: "DELETE_WISHLIST_ITEM",
        payload: { eventId, itemId: item.id },
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  // Handle edit button
  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  // Handle add button
  const handleAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  // Get participant avatar color (deterministic based on name)
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-orange-100 text-orange-700",
      "bg-green-100 text-green-700",
      "bg-indigo-100 text-indigo-700",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Event not found</p>
          <button
            onClick={() => navigate("/events")}
            className="text-primary hover:underline"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-10 flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between border-b border-gray-200 dark:border-gray-800">
          <div className="flex size-12 shrink-0 items-center">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
              Gift Registry
            </h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {event.name}
            </p>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent gap-2 p-0">
              <Info className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Loading skeleton - vertical layout matching new list structure */}
        <main className="flex flex-col pb-24 p-4">
          <div className="animate-pulse space-y-3 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="flex-1 h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex size-12 shrink-0 items-center">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
            Gift Registry
          </h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {event.name}
          </p>
        </div>
        <div className="flex w-12 items-center justify-end">
          <button className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent gap-2 p-0">
            <Info className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-col pb-24">
        {/* Section Header: Your Wishlist */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Your Wishlist
          </h2>
          <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-[#0d1b12] dark:text-primary rounded-full">
            Visible to others
          </span>
        </div>

        {/* Vertical DnD Personal Wishlist */}
        {displayPersonalItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">No items yet</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Add gifts you'd love to receive
            </p>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Your First Gift
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedIds}
                strategy={verticalListSortingStrategy}
              >
                {displayPersonalItems.map((item) => (
                  <SortableWishlistCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Action: Add Gift Button */}
        {displayPersonalItems.length > 0 && (
          <div className="px-4 py-4">
            <button
              onClick={handleAdd}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-primary-500 text-on-primary-0 gap-2 text-sm font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              <span>Add to Wishlist</span>
            </button>
          </div>
        )}

        {/* Section Header: Registry */}
        <div className="px-4 pt-8 pb-4">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Registry
          </h2>
          <p className="text-sm text-gray-500">Claim gifts to buy for others</p>
        </div>

        {/* Registry List Organized by Participant */}
        <div className="space-y-6 px-4">
          {sortedParticipantNames.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No other wishlists yet</p>
            </div>
          ) : (
            sortedParticipantNames.map((participantName) => {
              const items = groupedRegistry[participantName];
              const avatarColor = getAvatarColor(participantName);
              const initial = participantName.charAt(0).toUpperCase();

              return (
                <div key={participantName} className="flex flex-col gap-3">
                  {/* Participant Header */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center overflow-hidden border border-white ${avatarColor}`}
                    >
                      <span className="text-sm font-bold">{initial}</span>
                    </div>
                    <h3 className="font-bold text-base">
                      {participantName}'s Wishlist
                    </h3>
                  </div>

                  {/* Participant's Gifts */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <WishlistRegistryItem
                        key={item.id}
                        item={item}
                        onClaim={() =>
                          claimMutation.mutate({
                            eventId: eventId!,
                            wishlistId: item.id,
                          })
                        }
                        onUnclaim={() =>
                          unclaimMutation.mutate({
                            eventId: eventId!,
                            wishlistId: item.id,
                          })
                        }
                        isPending={
                          claimMutation.isPending || unclaimMutation.isPending
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Wishlist Form Drawer */}
      <WishlistForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editItem={editingItem}
        isSaving={isSaving}
      />
    </div>
  );
}
