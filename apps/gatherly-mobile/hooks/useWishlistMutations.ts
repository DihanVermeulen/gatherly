import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Event } from "../api/events";
import { wishlistsApi } from "../api/wishlists";

type ClaimVariables = { eventId: string; wishlistId: number };
type ClaimContext = { previous: Event[] | undefined };

/**
 * Hook for claiming a wishlist item with optimistic updates.
 *
 * Optimistically marks the item as claimed by the current participant immediately,
 * then confirms with the server. Rolls back to previous state on 409 conflict or
 * any other error.
 */
export function useClaimWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, ClaimVariables, ClaimContext>({
    mutationKey: ["wishlist", "claim"],
    networkMode: "online",
    mutationFn: ({ eventId, wishlistId }) =>
      wishlistsApi.claim(eventId, wishlistId),

    onMutate: async ({ eventId, wishlistId }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // Optimistically update the matching wishlist item
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((event) => {
          if (event.id !== eventId) return event;
          return {
            ...event,
            wishlists: (event.wishlists || []).map((item) =>
              item.id === wishlistId
                ? { ...item, isClaimed: true, claimedByMe: true }
                : item
            ),
          };
        })
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      // Rollback to previous snapshot on error (including 409 conflict)
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // Only invalidate when this is the last in-flight claim mutation
      // to prevent cache thrashing during concurrent mutations
      if (queryClient.isMutating({ mutationKey: ["wishlist", "claim"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
  });
}

/**
 * Hook for unclaiming a wishlist item with optimistic updates.
 *
 * Optimistically marks the item as unclaimed immediately,
 * then confirms with the server. Rolls back to previous state on error.
 */
export function useUnclaimWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, ClaimVariables, ClaimContext>({
    mutationKey: ["wishlist", "unclaim"],
    networkMode: "online",
    mutationFn: ({ eventId, wishlistId }) =>
      wishlistsApi.unclaim(eventId, wishlistId),

    onMutate: async ({ eventId, wishlistId }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // Optimistically update the matching wishlist item
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((event) => {
          if (event.id !== eventId) return event;
          return {
            ...event,
            wishlists: (event.wishlists || []).map((item) =>
              item.id === wishlistId
                ? { ...item, isClaimed: false, claimedByMe: false }
                : item
            ),
          };
        })
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      // Rollback to previous snapshot on error
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // Only invalidate when this is the last in-flight unclaim mutation
      if (queryClient.isMutating({ mutationKey: ["wishlist", "unclaim"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
  });
}

type ReorderVariables = {
  eventId: string;
  participantId: number;
  orderedIds: number[];
};
type ReorderContext = { previous: Event[] | undefined };

/**
 * Hook for reordering wishlist items with optimistic updates.
 *
 * Optimistically reorders items in the cache immediately based on orderedIds,
 * then confirms with the server. Rolls back to previous state on error.
 */
export function useReorderWishlistItems() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, ReorderVariables, ReorderContext>({
    mutationKey: ["wishlist", "reorder"],
    networkMode: "online",
    mutationFn: ({ eventId, participantId, orderedIds }) =>
      wishlistsApi.reorder(eventId, participantId, orderedIds),

    onMutate: async ({ eventId, participantId, orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((event) => {
          if (event.id !== eventId) return event;
          const wishlists = event.wishlists || [];
          // Build reordered personal items based on orderedIds
          const personalMap = new Map(
            wishlists
              .filter((w) => w.participantId === participantId)
              .map((w) => [w.id, w])
          );
          const reorderedPersonal = orderedIds
            .map((id, index) => {
              const item = personalMap.get(id);
              return item ? { ...item, sortOrder: index + 1 } : null;
            })
            .filter(Boolean) as typeof wishlists;
          // Keep other participants' items unchanged
          const otherItems = wishlists.filter(
            (w) => w.participantId !== participantId
          );
          return {
            ...event,
            wishlists: [...reorderedPersonal, ...otherItems],
          };
        })
      );

      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ["wishlist", "reorder"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
  });
}
