import React, { createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Event, WishlistItem } from "../api/events";
import { useEventsQuery } from "../hooks/useEventQueries";
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "../hooks/useEventMutations";

type EventsState = {
  events: Event[];
  loading: boolean;
  error: string | null;
};

type EventsAction =
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "UPDATE_EVENT"; payload: Event }
  | { type: "DELETE_EVENT"; payload: string }
  | { type: "SET_EVENTS"; payload: Event[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "ADD_WISHLIST_ITEM";
      payload: { eventId: string; item: WishlistItem };
    }
  | {
      type: "UPDATE_WISHLIST_ITEM";
      payload: { eventId: string; item: WishlistItem };
    }
  | {
      type: "DELETE_WISHLIST_ITEM";
      payload: { eventId: string; itemId: number };
    }
  | {
      type: "SET_WISHLISTS";
      payload: { eventId: string; items: WishlistItem[] };
    };

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
};

const EventsContext = createContext<{
  state: EventsState;
  dispatch: React.Dispatch<EventsAction>;
  refreshEvents: () => Promise<void>;
  useApi: boolean;
}>({
  state: initialState,
  dispatch: () => null,
  refreshEvents: async () => {},
  useApi: false,
});

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  // Query for events data
  const { data: events, isLoading, error, refetch } = useEventsQuery();

  // Mutations for CRUD operations
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  // Build state object from query data
  const state: EventsState = {
    events: (events || []).map((e) => ({
      ...e,
      wishlists: e.wishlists || [],
      gifts: e.gifts || {},
    })),
    loading: isLoading,
    error: error ? error.message : null,
  };

  // TanStack Query handles offline-first transparently, so useApi is always true
  const useApi = true;

  // Wishlist action handler - updates cache directly
  const handleWishlistAction = (action: EventsAction) => {
    queryClient.setQueryData<Event[]>(["events"], (old = []) => {
      switch (action.type) {
        case "ADD_WISHLIST_ITEM":
          return old.map((e) =>
            e.id === action.payload.eventId
              ? {
                  ...e,
                  wishlists: [action.payload.item, ...(e.wishlists || [])],
                }
              : e,
          );
        case "UPDATE_WISHLIST_ITEM":
          return old.map((e) =>
            e.id === action.payload.eventId
              ? {
                  ...e,
                  wishlists: (e.wishlists || []).map((item) =>
                    item.id === action.payload.item.id
                      ? action.payload.item
                      : item,
                  ),
                }
              : e,
          );
        case "DELETE_WISHLIST_ITEM":
          return old.map((e) =>
            e.id === action.payload.eventId
              ? {
                  ...e,
                  wishlists: (e.wishlists || []).filter(
                    (item) => item.id !== action.payload.itemId,
                  ),
                }
              : e,
          );
        case "SET_WISHLISTS":
          return old.map((e) =>
            e.id === action.payload.eventId
              ? { ...e, wishlists: action.payload.items }
              : e,
          );
        default:
          return old;
      }
    });
  };

  // Dispatch wrapper - maps actions to mutations
  const dispatch = (action: EventsAction) => {
    switch (action.type) {
      case "ADD_EVENT":
        createMutation.mutate({
          name: action.payload.name,
          coupleCrossing: action.payload.coupleCrossing || false,
        });
        break;
      case "UPDATE_EVENT":
        updateMutation.mutate(action.payload);
        break;
      case "DELETE_EVENT":
        deleteMutation.mutate(action.payload);
        break;
      case "SET_EVENTS":
      case "SET_LOADING":
      case "SET_ERROR":
        // These are handled by TanStack Query state - ignore
        break;
      case "ADD_WISHLIST_ITEM":
      case "UPDATE_WISHLIST_ITEM":
      case "DELETE_WISHLIST_ITEM":
      case "SET_WISHLISTS":
        handleWishlistAction(action);
        break;
    }
  };

  // Refresh events wrapper
  const refreshEvents = async () => {
    await refetch();
  };

  return (
    <EventsContext.Provider value={{ state, dispatch, refreshEvents, useApi }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
};
