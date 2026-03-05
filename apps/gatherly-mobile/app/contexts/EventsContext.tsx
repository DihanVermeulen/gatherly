import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import { eventsApi, Event, WishlistItem } from "../api/events";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useSession } from "./AuthContext";
import { cacheEvents, loadCachedEvents } from "@/lib/cache";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.9:5001";

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
    }
  | { type: "CLAIM_WISHLIST_ITEM"; payload: { eventId: string; itemId: number } }
  | { type: "UNCLAIM_WISHLIST_ITEM"; payload: { eventId: string; itemId: number } };

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

const eventsReducer = (
  state: EventsState,
  action: EventsAction,
): EventsState => {
  switch (action.type) {
    case "SET_EVENTS":
      return {
        ...state,
        events: action.payload.map((event) => ({
          ...event,
          wishlists: event.wishlists || [],
          gifts: event.gifts || {},
        })),
        loading: false,
      };
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] };
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.id ? action.payload : event,
        ),
      };
    case "DELETE_EVENT":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.payload),
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "ADD_WISHLIST_ITEM":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? {
                ...event,
                wishlists: [action.payload.item, ...(event.wishlists || [])],
              }
            : event,
        ),
      };
    case "UPDATE_WISHLIST_ITEM":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? {
                ...event,
                wishlists: (event.wishlists || []).map((item) =>
                  item.id === action.payload.item.id
                    ? action.payload.item
                    : item,
                ),
              }
            : event,
        ),
      };
    case "DELETE_WISHLIST_ITEM":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? {
                ...event,
                wishlists: (event.wishlists || []).filter(
                  (item) => item.id !== action.payload.itemId,
                ),
              }
            : event,
        ),
      };
    case "SET_WISHLISTS":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? { ...event, wishlists: action.payload.items }
            : event,
        ),
      };
    case "CLAIM_WISHLIST_ITEM":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? {
                ...event,
                wishlists: (event.wishlists || []).map((item) =>
                  item.id === action.payload.itemId
                    ? { ...item, isClaimed: true, claimedByMe: true }
                    : item
                ),
              }
            : event
        ),
      };
    case "UNCLAIM_WISHLIST_ITEM":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.payload.eventId
            ? {
                ...event,
                wishlists: (event.wishlists || []).map((item) =>
                  item.id === action.payload.itemId
                    ? { ...item, isClaimed: false, claimedByMe: false }
                    : item
                ),
              }
            : event
        ),
      };
    default:
      return state;
  }
};

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [useApi, setUseApi] = useState(false);

  const [state, dispatch] = useReducer(eventsReducer, initialState);

  const db = useDatabase();
  const { user } = useSession();
  const userId = user?.id ? String(user.id) : null;

  // Load cached events from SQLite on mount, filtered to the current user.
  useEffect(() => {
    let mounted = true;
    const loadFromStorage = async () => {
      try {
        const events = await loadCachedEvents(db, userId ?? undefined);
        if (mounted && events.length > 0) {
          dispatch({ type: "SET_EVENTS", payload: events });
        }
      } catch (err) {
        console.log("Failed to load cached events:", err);
      }
    };
    loadFromStorage();
    return () => { mounted = false; };
  }, [db, userId]);

  // Check if API is available on mount, then fetch fresh data
  useEffect(() => {
    let mounted = true;
    const checkApi = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        if (!mounted) return;
        if (response.ok) {
          setUseApi(true);
          // Load directly here — don't call refreshEvents() which reads stale useApi state
          dispatch({ type: "SET_LOADING", payload: true });
          const events = await eventsApi.getAll();
          if (!mounted) return;
          dispatch({ type: "SET_EVENTS", payload: events });
          await cacheEvents(db, events, userId ?? undefined);
        }
      } catch (error) {
        if (!mounted) return;
        console.log("API not available, using cached data");
        setUseApi(false);
      }
    };
    checkApi();
    return () => { mounted = false; };
  }, [db, userId]);

  // Refresh events from API (for manual refresh calls)
  const refreshEvents = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const events = await eventsApi.getAll();
      dispatch({ type: "SET_EVENTS", payload: events });
      await cacheEvents(db, events, userId ?? undefined);
    } catch (error) {
      console.error("Error fetching events:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load events" });
      setUseApi(false);
    }
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

export default EventsContext;
