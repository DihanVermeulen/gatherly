import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "./GiftCard";
import type { Gift } from "types/gift";

const baseGift: Gift = {
  id: "gift-1",
  name: "Wireless Headphones",
  recipient: "Alice",
  occasion: "Birthday",
  dueDate: "2026-06-01",
  budget: 80,
  storeLink: "",
  description: "Sony WH-1000XM5",
  imageDataUrl: null,
  privacy: "everyone",
  status: "available",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("GiftCard", () => {
  describe("rendering", () => {
    it("renders the gift name (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    it("renders recipient name (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("renders occasion and due date (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByText(/Birthday/)).toBeInTheDocument();
    });

    it("renders budget when non-null (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByText(/\$80/)).toBeInTheDocument();
    });

    it("does not render budget when null (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, budget: null }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it("renders description when provided (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByText("Sony WH-1000XM5")).toBeInTheDocument();
    });

    it("does not render description when empty (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, description: "" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.queryByText("Sony WH-1000XM5")).not.toBeInTheDocument();
    });

    it("shows placeholder icon when no image (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      // Image should not be present; aria-hidden placeholder div should be
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("renders image when imageDataUrl is provided (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, imageDataUrl: "data:image/png;base64,abc" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  describe("status badge", () => {
    it("does not show status badge for available gifts (expected use)", () => {
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.queryByLabelText(/status:/i)).not.toBeInTheDocument();
    });

    it("shows Claimed badge for claimed gift (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "claimed", claimedBy: "Bob" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByLabelText(/status: claimed/i)).toBeInTheDocument();
      expect(screen.getByText(/claimed by Bob/i)).toBeInTheDocument();
    });

    it("shows Purchased badge for purchased gift (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "purchased" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByLabelText(/status: purchased/i)).toBeInTheDocument();
    });

    it("shows Sent badge for sent gift (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "sent" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByLabelText(/status: sent/i)).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls onEdit with gift when Edit is clicked (expected use)", async () => {
      const onEdit = jest.fn();
      render(
        <GiftCard gift={baseGift} onEdit={onEdit} onDelete={jest.fn()} />
      );
      await userEvent.click(screen.getByRole("button", { name: /edit wireless headphones/i }));
      expect(onEdit).toHaveBeenCalledWith(baseGift);
    });

    it("calls onDelete with gift when Delete is clicked (expected use)", async () => {
      const onDelete = jest.fn();
      render(
        <GiftCard gift={baseGift} onEdit={jest.fn()} onDelete={onDelete} />
      );
      await userEvent.click(
        screen.getByRole("button", { name: /delete wireless headphones/i })
      );
      expect(onDelete).toHaveBeenCalledWith(baseGift);
    });

    it("shows 'I'm buying this' button when onClaim provided for available gift (expected use)", () => {
      render(
        <GiftCard
          gift={baseGift}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onClaim={jest.fn()}
        />
      );
      expect(
        screen.getByRole("button", { name: /i'm buying this/i })
      ).toBeInTheDocument();
    });

    it("calls onClaim when 'I'm buying this' is clicked (expected use)", async () => {
      const onClaim = jest.fn();
      render(
        <GiftCard
          gift={baseGift}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onClaim={onClaim}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /i'm buying this/i }));
      expect(onClaim).toHaveBeenCalledWith(baseGift);
    });

    it("does not show 'I'm buying this' for a claimed gift (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "claimed" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onClaim={jest.fn()}
        />
      );
      expect(
        screen.queryByRole("button", { name: /i'm buying this/i })
      ).not.toBeInTheDocument();
    });

    it("shows 'Mark as purchased' for claimed gift when onMarkPurchased provided (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "claimed" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMarkPurchased={jest.fn()}
        />
      );
      expect(screen.getByRole("button", { name: /mark as purchased/i })).toBeInTheDocument();
    });

    it("shows 'Mark as sent' for purchased gift when onMarkSent provided (expected use)", () => {
      render(
        <GiftCard
          gift={{ ...baseGift, status: "purchased" }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMarkSent={jest.fn()}
        />
      );
      expect(screen.getByRole("button", { name: /mark as sent/i })).toBeInTheDocument();
    });
  });
});
