import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { EventsProvider, useEvents } from "./EventsContext";
import type { Event } from "../api/events";

const mockEvent: Event = {
  id: "evt-1",
  name: "Christmas 2026",
  people: ["Alice", "Bob"],
  couples: [],
  assignments: null,
  coupleCrossing: false,
  gifts: {},
  date: "2026-12-25",
  participants: ["Alice", "Bob"],
};

const TestConsumer: React.FC<{
  onRender?: (ctx: ReturnType<typeof useEvents>) => void;
}> = ({ onRender }) => {
  const ctx = useEvents();
  onRender?.(ctx);
  return (
    <ul>
      {ctx.state.events.map((e) => (
        <li key={e.id} data-testid={`event-${e.id}`}>
          {e.name}
        </li>
      ))}
      {ctx.state.loading && <li data-testid="loading">Loading...</li>}
      {ctx.state.error && <li data-testid="error">{ctx.state.error}</li>}
    </ul>
  );
};

function renderWithProvider(ui: React.ReactElement = <TestConsumer />) {
  return render(<EventsProvider>{ui}</EventsProvider>);
}

describe("EventsContext", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    // Default: API not available
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
  });

  describe("initial state", () => {
    it("starts with empty events and no error (expected use)", async () => {
      renderWithProvider();
      await waitFor(() => {
        expect(screen.queryByTestId("error")).not.toBeInTheDocument();
      });
      expect(screen.queryAllByTestId(/^event-/)).toHaveLength(0);
    });

    it("restores events from localStorage on mount (expected use)", async () => {
      localStorage.setItem(
        "secret_santa_events",
        JSON.stringify({ events: [mockEvent] })
      );
      renderWithProvider();
      expect(screen.getByTestId("event-evt-1")).toBeInTheDocument();
    });
  });

  describe("reducer - ADD_EVENT", () => {
    it("adds event to the list (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "ADD_EVENT", payload: mockEvent });
      });

      expect(screen.getByTestId("event-evt-1")).toBeInTheDocument();
    });
  });

  describe("reducer - UPDATE_EVENT", () => {
    it("updates an existing event by id (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "ADD_EVENT", payload: mockEvent });
      });
      act(() => {
        ctx!.dispatch({
          type: "UPDATE_EVENT",
          payload: { ...mockEvent, name: "Updated Event" },
        });
      });

      expect(screen.getByTestId("event-evt-1")).toHaveTextContent("Updated Event");
    });
  });

  describe("reducer - DELETE_EVENT", () => {
    it("removes event with matching id (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "ADD_EVENT", payload: mockEvent });
      });
      act(() => {
        ctx!.dispatch({ type: "DELETE_EVENT", payload: "evt-1" });
      });

      expect(screen.queryByTestId("event-evt-1")).not.toBeInTheDocument();
    });
  });

  describe("reducer - SET_EVENTS", () => {
    it("replaces entire events list and clears loading (expected use)", async () => {
      const second: Event = { ...mockEvent, id: "evt-2", name: "Birthday Party" };
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "ADD_EVENT", payload: mockEvent });
      });
      act(() => {
        ctx!.dispatch({ type: "SET_EVENTS", payload: [second] });
      });

      expect(screen.queryByTestId("event-evt-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("event-evt-2")).toBeInTheDocument();
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });
  });

  describe("reducer - SET_LOADING", () => {
    it("shows loading indicator when true (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "SET_LOADING", payload: true });
      });

      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
  });

  describe("reducer - SET_ERROR", () => {
    it("displays the error message and clears loading (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "SET_ERROR", payload: "Something went wrong" });
      });

      expect(screen.getByTestId("error")).toHaveTextContent("Something went wrong");
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    it("clears the error when SET_ERROR is called with null (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "SET_ERROR", payload: "Oops" });
      });
      act(() => {
        ctx!.dispatch({ type: "SET_ERROR", payload: null });
      });

      expect(screen.queryByTestId("error")).not.toBeInTheDocument();
    });
  });

  describe("localStorage persistence", () => {
    it("saves events to localStorage when not using API (expected use)", async () => {
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());

      act(() => {
        ctx!.dispatch({ type: "ADD_EVENT", payload: mockEvent });
      });

      const stored = JSON.parse(
        localStorage.getItem("secret_santa_events") ?? "{}"
      );
      expect(stored.events).toHaveLength(1);
      expect(stored.events[0].id).toBe("evt-1");
    });
  });

  describe("API availability check", () => {
    it("sets useApi=false when status endpoint is unreachable (failure case)", async () => {
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
      let ctx: ReturnType<typeof useEvents>;
      renderWithProvider(<TestConsumer onRender={(c) => { ctx = c; }} />);

      await waitFor(() => expect(ctx!).toBeDefined());
      await waitFor(() => {
        expect(ctx!.useApi).toBe(false);
      });
    });
  });
});
