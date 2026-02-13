import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, Event } from "../api/events";

/**
 * Hook for fetching all events with offline-first caching.
 *
 * Returns TanStack Query result with events data, loading state, and refetch function.
 * Configured with 5-minute stale time and offline-first network mode.
 *
 * Wishlist preservation: When the API refetches events (e.g. after a mutation's
 * onSettled invalidation), the server response does not include wishlists because
 * they are loaded separately by the wishlist page. This hook merges incoming server
 * events with any existing wishlist data already in the cache so wishlists are not
 * lost on background refetches.
 */
export function useEventsQuery() {
  const queryClient = useQueryClient();

  return useQuery<Event[], Error>({
    queryKey: ["events"],
    queryFn: async () => {
      const incoming = await eventsApi.getAll();

      // Preserve wishlist data from existing cache entries
      const existing = queryClient.getQueryData<Event[]>(["events"]);
      if (!existing || existing.length === 0) {
        return incoming;
      }

      const existingById = new Map(existing.map((e) => [e.id, e]));

      return incoming.map((event) => {
        const cached = existingById.get(event.id);
        // Merge wishlists from cache if the incoming event has none (API does
        // not return wishlists in the list endpoint)
        if (cached && cached.wishlists && cached.wishlists.length > 0 && !event.wishlists?.length) {
          return { ...event, wishlists: cached.wishlists };
        }
        return event;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    networkMode: "offlineFirst",
  });
}

/**
 * Hook for fetching a single event by ID with offline-first caching.
 *
 * Only runs query when id is truthy (enabled: !!id).
 */
export function useEventByIdQuery(id: string) {
  return useQuery<Event, Error>({
    queryKey: ["events", id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
    networkMode: "offlineFirst",
  });
}
