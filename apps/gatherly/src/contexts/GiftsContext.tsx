import React, { createContext, useContext, useReducer } from "react";
import type { Gift } from "types/gift";

type GiftsState = { gifts: Gift[] };

type GiftsAction =
  | { type: "SET_GIFTS"; payload: Gift[] }
  | { type: "ADD_GIFT"; payload: Gift }
  | { type: "UPDATE_GIFT"; payload: Gift }
  | { type: "DELETE_GIFT"; payload: string };

const initialState: GiftsState = { gifts: [] };

const GiftsContext = createContext<{
  state: GiftsState;
  dispatch: React.Dispatch<GiftsAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

function giftsReducer(state: GiftsState, action: GiftsAction): GiftsState {
  switch (action.type) {
    case "SET_GIFTS":
      return { ...state, gifts: action.payload };
    case "ADD_GIFT":
      return { ...state, gifts: [action.payload, ...state.gifts] };
    case "UPDATE_GIFT":
      return {
        ...state,
        gifts: state.gifts.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case "DELETE_GIFT":
      return {
        ...state,
        gifts: state.gifts.filter((g) => g.id !== action.payload),
      };
    default:
      return state;
  }
}

const STORAGE_KEY = "secret_santa_gifts";

export const GiftsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(giftsReducer, initialState, () => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialState;
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  return (
    <GiftsContext.Provider value={{ state, dispatch }}>
      {children}
    </GiftsContext.Provider>
  );
};

export const useGifts = () => {
  const context = useContext(GiftsContext);
  if (context === undefined) {
    throw new Error("useGifts must be used within a GiftsProvider");
  }
  return context;
};
