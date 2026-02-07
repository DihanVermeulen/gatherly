import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Info } from "lucide-react";
import { useEvents } from "contexts/EventsContext";
import {
  WishlistForm,
  WishlistCard,
  WishlistRegistryItem,
} from "components/wishlist";
import { wishlistsApi } from "api/wishlists";
import type { WishlistItem } from "api/events";
import type { WishlistFormData } from "components/wishlist/WishlistForm";

export function WishlistPage() {
  const { eventId, participantId } = useParams<{
    eventId: string;
    participantId: string;
  }>();
  const navigate = useNavigate();
  const { state, dispatch, useApi } = useEvents();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [swipingItemId, setSwipingItemId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);

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
    if (item.claimedBy) {
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

  // Swipe-to-delete touch handlers
  const handleTouchStart = (e: React.TouchEvent, itemId: number) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingItemId(itemId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipingItemId === null) return;

    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < 80) {
      // Reset if not swiped far enough
      setSwipeOffset(0);
      setSwipingItemId(null);
    }
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
    setSwipingItemId(null);
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

        {/* Loading skeleton */}
        <main className="flex flex-col pb-24 p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4"></div>
            <div className="flex gap-4 overflow-x-hidden mb-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-44 h-64 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0"
                ></div>
              ))}
            </div>
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

        {/* Carousel: Personal Wishlist Items */}
        <div className="flex overflow-x-auto hide-scrollbar gap-4 px-4 py-2">
          {personalItems.map((item) => (
            <div
              key={item.id}
              className="relative"
              onTouchStart={(e) => handleTouchStart(e, item.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipeable card wrapper */}
              <div
                className="transition-transform"
                style={{
                  transform:
                    swipingItemId === item.id
                      ? `translateX(-${swipeOffset}px)`
                      : "translateX(0)",
                }}
              >
                <WishlistCard item={item} onEdit={handleEdit} />
              </div>

              {/* Delete button revealed by swipe */}
              {swipingItemId === item.id && swipeOffset > 0 && (
                <button
                  onClick={() => {
                    handleDelete(item);
                    resetSwipe();
                  }}
                  className="absolute right-0 top-0 h-full w-20 bg-red-500 text-white font-bold rounded-r-xl flex items-center justify-center"
                  style={{ transform: `translateX(${80 - swipeOffset}px)` }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}

          {/* Add More Placeholder */}
          <button
            onClick={handleAdd}
            className="flex flex-col w-44 shrink-0 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 items-center justify-center p-4"
          >
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <Plus className="text-primary" />
            </div>
            <p className="text-xs font-bold text-center">Add More</p>
          </button>
        </div>

        {/* Action: Add Gift Button */}
        <div className="px-4 py-4">
          <button
            onClick={handleAdd}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 px-4 bg-primary text-[#0d1b12] gap-2 text-sm font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span>
              {personalItems.length === 0
                ? "Add Your First Gift"
                : "Add to Wishlist"}
            </span>
          </button>
        </div>

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
                        isClaimed={!!item.claimedBy}
                        onClaim={undefined} // Phase 3 will implement claiming
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
