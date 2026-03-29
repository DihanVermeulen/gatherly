import React from "react";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistryList } from "./RegistryList";
import { GiftsProvider, useGifts } from "contexts/GiftsContext";
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

function makeGift(overrides: Partial<Gift> & { id: string }): Gift {
  return { ...baseGift, ...overrides };
}

/** Seed gifts via dispatch before rendering RegistryList */
const Seeder: React.FC<{ gifts: Gift[]; children: React.ReactNode }> = ({
  gifts,
  children,
}) => {
  const { dispatch } = useGifts();
  React.useEffect(() => {
    dispatch({ type: "SET_GIFTS", payload: gifts });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>;
};

function renderList(
  gifts: Gift[] = [],
  props: Partial<React.ComponentProps<typeof RegistryList>> = {}
) {
  const onEditGift = jest.fn();
  const onScrollToCreate = jest.fn();
  render(
    <GiftsProvider>
      <Seeder gifts={gifts}>
        <RegistryList
          onEditGift={onEditGift}
          onScrollToCreate={onScrollToCreate}
          {...props}
        />
      </Seeder>
    </GiftsProvider>
  );
  return { onEditGift, onScrollToCreate };
}

describe("RegistryList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("empty state", () => {
    it("shows empty state message when no gifts exist (expected use)", () => {
      renderList([]);
      expect(screen.getByText(/no gifts yet/i)).toBeInTheDocument();
    });

    it("shows Create First Gift button in empty state (expected use)", () => {
      renderList([]);
      expect(
        screen.getByRole("button", { name: /create first gift/i })
      ).toBeInTheDocument();
    });

    it("calls onScrollToCreate when Create First Gift is clicked (expected use)", async () => {
      const { onScrollToCreate } = renderList([]);
      await userEvent.click(
        screen.getByRole("button", { name: /create first gift/i })
      );
      expect(onScrollToCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("gift list", () => {
    it("renders gift cards when gifts exist (expected use)", () => {
      renderList([baseGift]);
      expect(screen.getByText("Headphones")).toBeInTheDocument();
    });

    it("renders multiple gift cards (expected use)", () => {
      renderList([
        baseGift,
        makeGift({ id: "gift-2", name: "Camera" }),
      ]);
      expect(screen.getByText("Headphones")).toBeInTheDocument();
      expect(screen.getByText("Camera")).toBeInTheDocument();
    });

    it("result count reflects number of gifts (expected use)", () => {
      renderList([baseGift, makeGift({ id: "gift-2", name: "Camera" })]);
      expect(screen.getByText(/2 items/i)).toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("opens delete confirmation dialog when Delete is clicked (expected use)", async () => {
      renderList([baseGift]);
      await userEvent.click(
        screen.getByRole("button", { name: /delete headphones/i })
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/delete gift\?/i)).toBeInTheDocument();
    });

    it("removes gift after confirming delete (expected use)", async () => {
      renderList([baseGift]);
      await userEvent.click(
        screen.getByRole("button", { name: /delete headphones/i })
      );
      await userEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: /^delete$/i })
      );
      expect(screen.queryByText("Headphones")).not.toBeInTheDocument();
    });

    it("dismisses dialog without deleting on Cancel (expected use)", async () => {
      renderList([baseGift]);
      await userEvent.click(
        screen.getByRole("button", { name: /delete headphones/i })
      );
      await userEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: /cancel/i })
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Headphones")).toBeInTheDocument();
    });
  });

  describe("edit flow", () => {
    it("calls onEditGift with the gift when Edit is clicked (expected use)", async () => {
      const { onEditGift } = renderList([baseGift]);
      await userEvent.click(
        screen.getByRole("button", { name: /edit headphones/i })
      );
      expect(onEditGift).toHaveBeenCalledWith(baseGift);
    });
  });

  describe("status transitions", () => {
    it("shows 'I'm buying this' for available gift when currentUserName provided (expected use)", () => {
      renderList([baseGift], { currentUserName: "Bob" });
      expect(
        screen.getByRole("button", { name: /i'm buying this/i })
      ).toBeInTheDocument();
    });

    it("does not show 'I'm buying this' when currentUserName is null (expected use)", () => {
      renderList([baseGift], { currentUserName: null });
      expect(
        screen.queryByRole("button", { name: /i'm buying this/i })
      ).not.toBeInTheDocument();
    });

    it("updates gift to claimed status after claiming (expected use)", async () => {
      renderList([baseGift], { currentUserName: "Bob" });
      await userEvent.click(
        screen.getByRole("button", { name: /i'm buying this/i })
      );
      expect(screen.getByLabelText(/status: claimed/i)).toBeInTheDocument();
    });

    it("shows 'Mark as purchased' for claimed gift (expected use)", () => {
      renderList([makeGift({ id: "gift-1", status: "claimed", claimedBy: "Bob" })]);
      expect(
        screen.getByRole("button", { name: /mark as purchased/i })
      ).toBeInTheDocument();
    });

    it("marks gift as purchased when button clicked (expected use)", async () => {
      renderList([makeGift({ id: "gift-1", status: "claimed", claimedBy: "Bob" })]);
      await userEvent.click(
        screen.getByRole("button", { name: /mark as purchased/i })
      );
      expect(screen.getByLabelText(/status: purchased/i)).toBeInTheDocument();
    });

    it("marks gift as sent when Mark as sent is clicked (expected use)", async () => {
      renderList([makeGift({ id: "gift-1", status: "purchased" })]);
      await userEvent.click(
        screen.getByRole("button", { name: /mark as sent/i })
      );
      expect(screen.getByLabelText(/status: sent/i)).toBeInTheDocument();
    });
  });

  describe("filtering", () => {
    it("shows 'No gifts match your filters' when filters exclude all gifts (expected use)", async () => {
      renderList([baseGift]);
      // Expand filters
      await userEvent.click(screen.getByRole("button", { name: /filters/i }));
      await userEvent.type(
        screen.getByPlaceholderText(/filter by recipient/i),
        "Nobody"
      );
      expect(screen.getByText(/no gifts match your filters/i)).toBeInTheDocument();
    });

    it("shows 0 items count when filtered to empty (expected use)", async () => {
      renderList([baseGift]);
      await userEvent.click(screen.getByRole("button", { name: /filters/i }));
      await userEvent.type(
        screen.getByPlaceholderText(/filter by recipient/i),
        "Nobody"
      );
      expect(screen.getByText(/0 items/i)).toBeInTheDocument();
    });
  });

  describe("heading", () => {
    it("renders the Registry List heading (expected use)", () => {
      renderList([]);
      expect(
        screen.getByRole("heading", { name: /registry list/i })
      ).toBeInTheDocument();
    });
  });
});
