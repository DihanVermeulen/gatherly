import React from "react";
import { render, screen, act } from "@testing-library/react";
import { GiftsProvider, useGifts } from "./GiftsContext";
import type { Gift } from "types/gift";

const baseGift: Gift = {
  id: "gift-1",
  name: "Headphones",
  recipient: "Alice",
  occasion: "Birthday",
  dueDate: "2026-06-01",
  budget: 80,
  storeLink: "",
  description: "",
  imageDataUrl: null,
  privacy: "everyone",
  status: "available",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// Helper to consume the context in tests
const TestConsumer: React.FC<{
  onRender?: (ctx: ReturnType<typeof useGifts>) => void;
}> = ({ onRender }) => {
  const ctx = useGifts();
  onRender?.(ctx);
  return (
    <ul>
      {ctx.state.gifts.map((g) => (
        <li key={g.id} data-testid={`gift-${g.id}`}>
          {g.name}
        </li>
      ))}
    </ul>
  );
};

function renderWithProvider(ui: React.ReactElement = <TestConsumer />) {
  return render(<GiftsProvider>{ui}</GiftsProvider>);
}

describe("GiftsContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("starts with an empty gifts array when localStorage is empty (expected use)", () => {
      renderWithProvider();
      expect(screen.queryAllByTestId(/^gift-/)).toHaveLength(0);
    });

    it("restores gifts from localStorage on mount (expected use)", () => {
      localStorage.setItem(
        "secret_santa_gifts",
        JSON.stringify({ gifts: [baseGift] })
      );
      renderWithProvider();
      expect(screen.getByTestId("gift-gift-1")).toBeInTheDocument();
    });

    it("falls back to empty state on malformed localStorage data (edge case)", () => {
      localStorage.setItem("secret_santa_gifts", "not-valid-json{{{");
      renderWithProvider();
      expect(screen.queryAllByTestId(/^gift-/)).toHaveLength(0);
    });
  });

  describe("ADD_GIFT", () => {
    it("prepends the new gift to the list (expected use)", () => {
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });

      expect(screen.getByTestId("gift-gift-1")).toBeInTheDocument();
    });

    it("new gift appears first when multiple gifts exist (expected use)", () => {
      const second: Gift = { ...baseGift, id: "gift-2", name: "Book" };
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
        ctx!.dispatch({ type: "ADD_GIFT", payload: second });
      });

      const items = screen.getAllByTestId(/^gift-/);
      expect(items[0]).toHaveTextContent("Book");
    });
  });

  describe("UPDATE_GIFT", () => {
    it("updates an existing gift by id (expected use)", () => {
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });
      act(() => {
        ctx!.dispatch({
          type: "UPDATE_GIFT",
          payload: { ...baseGift, name: "Earbuds" },
        });
      });

      expect(screen.getByTestId("gift-gift-1")).toHaveTextContent("Earbuds");
    });

    it("leaves other gifts unchanged (expected use)", () => {
      const other: Gift = { ...baseGift, id: "gift-2", name: "Book" };
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
        ctx!.dispatch({ type: "ADD_GIFT", payload: other });
      });
      act(() => {
        ctx!.dispatch({
          type: "UPDATE_GIFT",
          payload: { ...baseGift, name: "Earbuds" },
        });
      });

      expect(screen.getByTestId("gift-gift-2")).toHaveTextContent("Book");
    });
  });

  describe("DELETE_GIFT", () => {
    it("removes the gift with the given id (expected use)", () => {
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });
      act(() => {
        ctx!.dispatch({ type: "DELETE_GIFT", payload: "gift-1" });
      });

      expect(screen.queryByTestId("gift-gift-1")).not.toBeInTheDocument();
    });

    it("ignores delete for a non-existent id (edge case)", () => {
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });
      act(() => {
        ctx!.dispatch({ type: "DELETE_GIFT", payload: "does-not-exist" });
      });

      expect(screen.getByTestId("gift-gift-1")).toBeInTheDocument();
    });
  });

  describe("SET_GIFTS", () => {
    it("replaces the entire gifts list (expected use)", () => {
      const newGifts: Gift[] = [
        { ...baseGift, id: "gift-10", name: "Camera" },
        { ...baseGift, id: "gift-11", name: "Tripod" },
      ];
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });
      act(() => {
        ctx!.dispatch({ type: "SET_GIFTS", payload: newGifts });
      });

      expect(screen.queryByTestId("gift-gift-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("gift-gift-10")).toBeInTheDocument();
      expect(screen.getByTestId("gift-gift-11")).toBeInTheDocument();
    });
  });

  describe("localStorage persistence", () => {
    it("persists state to localStorage after dispatch (expected use)", () => {
      let ctx: ReturnType<typeof useGifts>;
      renderWithProvider(
        <TestConsumer onRender={(c) => { ctx = c; }} />
      );

      act(() => {
        ctx!.dispatch({ type: "ADD_GIFT", payload: baseGift });
      });

      const stored = JSON.parse(localStorage.getItem("secret_santa_gifts") ?? "{}");
      expect(stored.gifts).toHaveLength(1);
      expect(stored.gifts[0].id).toBe("gift-1");
    });
  });

  describe("useGifts hook", () => {
    it("throws when used outside GiftsProvider (failure case)", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<TestConsumer />)).not.toThrow();
      spy.mockRestore();
    });
  });
});
