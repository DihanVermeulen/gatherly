import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGiftForm } from "./CreateGiftForm";
import type { Gift } from "types/gift";

const baseGift: Gift = {
  id: "gift-1",
  name: "Headphones",
  recipient: "Alice",
  occasion: "Birthday",
  dueDate: "2026-06-01",
  budget: 80,
  storeLink: "https://example.com",
  description: "Great sound",
  imageDataUrl: null,
  privacy: "everyone",
  status: "available",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function fillRequiredFields(name = "Test Gift", recipient = "Bob", occasion = "Christmas", dueDate = "2026-12-25") {
  return async () => {
    await userEvent.type(screen.getByRole("textbox", { name: /gift name/i }), name);
    await userEvent.type(document.getElementById("gift-recipient")!, recipient);
    await userEvent.type(document.getElementById("gift-occasion")!, occasion);
    await userEvent.type(document.getElementById("gift-due-date")!, dueDate);
  };
}

describe("CreateGiftForm", () => {
  describe("rendering", () => {
    it("renders all required form fields (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      expect(screen.getByRole("textbox", { name: /gift name/i })).toBeInTheDocument();
      expect(document.getElementById("gift-recipient")).toBeInTheDocument();
      expect(document.getElementById("gift-occasion")).toBeInTheDocument();
      expect(document.getElementById("gift-due-date")).toBeInTheDocument();
      expect(document.getElementById("gift-budget")).toBeInTheDocument();
      expect(document.getElementById("gift-store-link")).toBeInTheDocument();
      expect(document.getElementById("gift-description")).toBeInTheDocument();
      expect(document.getElementById("gift-privacy")).toBeInTheDocument();
    });

    it("submit button is disabled when form is empty (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      expect(screen.getByRole("button", { name: /add to registry/i })).toBeDisabled();
    });

    it("uses custom submitLabel (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} submitLabel="Save changes" />);
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("shows Saving... when loading=true (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} loading />);
      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
    });

    it("displays success message when provided (expected use)", () => {
      render(
        <CreateGiftForm
          onSubmit={jest.fn()}
          successMessage="Gift added!"
        />
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Gift added!");
    });

    it("calls onSuccessDismiss when dismiss button clicked (expected use)", async () => {
      const dismiss = jest.fn();
      render(
        <CreateGiftForm
          onSubmit={jest.fn()}
          successMessage="Done"
          onSuccessDismiss={dismiss}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(dismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("edit mode", () => {
    it("pre-fills fields from initialGift (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} initialGift={baseGift} submitLabel="Save changes" />);
      expect(screen.getByRole("textbox", { name: /gift name/i })).toHaveValue("Headphones");
      expect(document.getElementById("gift-recipient")).toHaveValue("Alice");
      expect(document.getElementById("gift-occasion")).toHaveValue("Birthday");
    });

    it("submit button is enabled when initialGift provides all required fields (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} initialGift={baseGift} submitLabel="Save changes" />);
      expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    });
  });

  describe("validation", () => {
    it("submit button becomes enabled when required fields are filled (expected use)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      const fill = fillRequiredFields();
      await fill();
      expect(screen.getByRole("button", { name: /add to registry/i })).toBeEnabled();
    });

    it("shows name error after blurring empty name field (failure case)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      const nameInput = screen.getByRole("textbox", { name: /gift name/i });
      await userEvent.click(nameInput);
      await userEvent.tab();
      expect(await screen.findByText(/gift name is required/i)).toBeInTheDocument();
    });

    it("shows recipient error after blurring empty recipient field (failure case)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      await userEvent.click(document.getElementById("gift-recipient")!);
      await userEvent.tab();
      expect(await screen.findByText(/recipient is required/i)).toBeInTheDocument();
    });

    it("shows character count for name field (expected use)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      await userEvent.type(screen.getByRole("textbox", { name: /gift name/i }), "Hi");
      expect(screen.getByText(/2\/120/)).toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("calls onSubmit with a gift object when form is valid (expected use)", async () => {
      const onSubmit = jest.fn();
      render(<CreateGiftForm onSubmit={onSubmit} />);
      await fillRequiredFields()();
      await userEvent.click(screen.getByRole("button", { name: /add to registry/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const submitted: Gift = onSubmit.mock.calls[0][0];
      expect(submitted.name).toBe("Test Gift");
      expect(submitted.recipient).toBe("Bob");
      expect(submitted.occasion).toBe("Christmas");
      expect(submitted.status).toBe("available");
    });

    it("resets form fields after successful add (expected use)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      await fillRequiredFields()();
      await userEvent.click(screen.getByRole("button", { name: /add to registry/i }));
      expect(screen.getByRole("textbox", { name: /gift name/i })).toHaveValue("");
    });

    it("does not call onSubmit while loading (edge case)", async () => {
      const onSubmit = jest.fn();
      render(<CreateGiftForm onSubmit={onSubmit} initialGift={baseGift} loading submitLabel="Save changes" />);
      await userEvent.click(screen.getByRole("button", { name: /saving/i }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("passes null budget when budget is empty string (edge case)", async () => {
      const onSubmit = jest.fn();
      render(<CreateGiftForm onSubmit={onSubmit} />);
      await fillRequiredFields()();
      await userEvent.click(screen.getByRole("button", { name: /add to registry/i }));
      const submitted: Gift = onSubmit.mock.calls[0][0];
      expect(submitted.budget).toBeNull();
    });

    it("preserves existing gift id and createdAt in edit mode (expected use)", async () => {
      const onSubmit = jest.fn();
      render(<CreateGiftForm onSubmit={onSubmit} initialGift={baseGift} submitLabel="Save changes" />);
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
      const submitted: Gift = onSubmit.mock.calls[0][0];
      expect(submitted.id).toBe(baseGift.id);
      expect(submitted.createdAt).toBe(baseGift.createdAt);
    });
  });

  describe("image upload", () => {
    it("shows upload area when no image is set (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      expect(screen.getByRole("group", { name: /upload gift image/i })).toBeInTheDocument();
    });

    it("shows remove button when an image is set via initialGift (expected use)", () => {
      render(
        <CreateGiftForm
          onSubmit={jest.fn()}
          initialGift={{ ...baseGift, imageDataUrl: "data:image/png;base64,abc" }}
          submitLabel="Save changes"
        />
      );
      expect(screen.getByRole("button", { name: /remove image/i })).toBeInTheDocument();
    });

    it("clears image when remove button is clicked (expected use)", async () => {
      render(
        <CreateGiftForm
          onSubmit={jest.fn()}
          initialGift={{ ...baseGift, imageDataUrl: "data:image/png;base64,abc" }}
          submitLabel="Save changes"
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /remove image/i }));
      expect(screen.queryByRole("button", { name: /remove image/i })).not.toBeInTheDocument();
    });
  });

  describe("privacy selector", () => {
    it("defaults to 'everyone' (expected use)", () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      expect(document.getElementById("gift-privacy")).toHaveValue("everyone");
    });

    it("allows changing privacy to santa_only (expected use)", async () => {
      render(<CreateGiftForm onSubmit={jest.fn()} />);
      await userEvent.selectOptions(
        document.getElementById("gift-privacy")!,
        "santa_only"
      );
      expect(document.getElementById("gift-privacy")).toHaveValue("santa_only");
    });
  });
});
