import { useQuery } from "@tanstack/react-query";
import { eventsApi, Event } from "../api/events";

/**
 * Hook for fetching all events with offline-first caching.
 *
 * Returns TanStack Query result with events data, loading state, and refetch function.
 * Configured with 5-minute stale time and offline-first network mode.
 */
export function useEventsQuery() {
  return useQuery<Event[], Error>({
    queryKey: ["events"],
    queryFn: eventsApi.getAll,
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
