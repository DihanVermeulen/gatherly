import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import { eventsApi, Event, WishlistItem } from "../api/events";

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
    default:
      return state;
  }
};

const STORAGE_KEY = "secret_santa_events";

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [useApi, setUseApi] = useState(false);

  // Initialize with localStorage
  const [state, dispatch] = useReducer(eventsReducer, initialState, () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure backward compatibility: add missing fields
        const events = (parsed.events || []).map((e: Event) => ({
          ...e,
          wishlists: e.wishlists || [],
          gifts: e.gifts || {},
        }));
        return { events, loading: false, error: null };
      }
    }
    return initialState;
  });

  // Check if API is available on mount
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch("http://localhost:5001/status");
        if (response.ok) {
          setUseApi(true);
          // Load events from API
          refreshEvents();
        }
      } catch (error) {
        console.log("API not available, using localStorage");
        setUseApi(false);
      }
    };

    checkApi();
  }, []);

  // Refresh events from API
  const refreshEvents = async () => {
    if (!useApi) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const events = await eventsApi.getAll();
      dispatch({ type: "SET_EVENTS", payload: events });
    } catch (error) {
      console.error("Error fetching events:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load events" });
      // Fallback to localStorage
      setUseApi(false);
    }
  };

  // Save to localStorage when not using API
  useEffect(() => {
    if (!useApi && typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ events: state.events }),
      );
    }
  }, [state.events, useApi]);

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
