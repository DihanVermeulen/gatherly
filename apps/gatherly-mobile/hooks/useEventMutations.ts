import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi, Event } from "../api/events";

/**
 * Hook for creating events with optimistic updates.
 *
 * Optimistically adds a temporary event to the cache immediately,
 * then replaces it with the server response on success.
 * Rolls back to previous state on error.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    Event,
    Error,
    { name: string; coupleCrossing: boolean },
    { previous: Event[] | undefined; tempId: string }
  >({
    mutationKey: ["event", "create"],
    networkMode: "online",
    mutationFn: ({ name, coupleCrossing }) =>
      eventsApi.create(name, coupleCrossing),

    onMutate: async ({ name, coupleCrossing }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // Optimistically add temp event
      const tempId = `temp-${Date.now()}`;
      const tempEvent: Event = {
        id: tempId,
        name,
        coupleCrossing,
        people: [],
        participants: [],
        couples: [],
        assignments: null,
        gifts: {},
        date: new Date().toISOString(),
        wishlists: [],
      };

      queryClient.setQueryData<Event[]>(["events"], (old = []) => [
        ...old,
        tempEvent,
      ]);

      return { previous, tempId };
    },

    onError: (err, variables, context) => {
      // Rollback to previous snapshot
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSuccess: (data, variables, context) => {
      // Replace temp event with real server response
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((event) =>
          event.id === context?.tempId ? data : event,
        ),
      );
    },

    onSettled: () => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/**
 * Hook for updating events with optimistic updates.
 *
 * Optimistically updates the event in cache immediately,
 * then syncs with server response on success.
 * Rolls back to previous state on error.
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation<Event, Error, Event, { previous: Event[] | undefined }>({
    mutationKey: ["event", "update"],
    networkMode: "online",
    mutationFn: (event) => {
      const { id, ...rest } = event;
      return eventsApi.update(id, rest);
    },

    onMutate: async (updatedEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // Optimistically update
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((event) =>
          event.id === updatedEvent.id ? updatedEvent : event,
        ),
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      // Rollback to previous snapshot
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/**
 * Hook for deleting events with optimistic updates.
 *
 * Optimistically removes the event from cache immediately,
 * then confirms deletion on success.
 * Rolls back to previous state on error.
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: Event[] | undefined }>({
    mutationKey: ["event", "delete"],
    networkMode: "online",
    mutationFn: (id) => eventsApi.delete(id),

    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // Optimistically remove
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.filter((event) => event.id !== id),
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      // Rollback to previous snapshot
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
