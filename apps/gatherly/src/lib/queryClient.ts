import { QueryClient, MutationCache } from "@tanstack/react-query";
import { eventsApi } from "../api/events";

/**
 * TanStack Query client configured for offline-first operation.
 *
 * Key settings:
 * - gcTime: 24h - cache persists for 24 hours in localStorage
 * - staleTime: 5min - data considered fresh for 5 minutes
 * - networkMode: 'offlineFirst' - optimistic updates work even when offline
 * - retry with exponential backoff for failed mutations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      console.log("Mutation synced:", mutation.options.mutationKey);
    },
  }),
});

/**
 * Mutation defaults for event operations.
 * These define the server-side sync functions that run when online.
 */
queryClient.setMutationDefaults(["event", "create"], {
  mutationFn: async (vars: { name: string; coupleCrossing: boolean }) => {
    return eventsApi.create(vars.name, vars.coupleCrossing);
  },
});

queryClient.setMutationDefaults(["event", "update"], {
  mutationFn: async (vars: { id: string; [key: string]: any }) => {
    const { id, ...rest } = vars;
    return eventsApi.update(id, rest);
  },
});

queryClient.setMutationDefaults(["event", "delete"], {
  mutationFn: async (id: string) => {
    return eventsApi.delete(id);
  },
});
