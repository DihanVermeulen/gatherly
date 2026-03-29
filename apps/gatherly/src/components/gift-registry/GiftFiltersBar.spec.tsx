import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftFiltersBar } from "./GiftFiltersBar";
import type { GiftFilters, GiftSortField, GiftSortDir } from "types/gift";

const defaultFilters: GiftFilters = {
  recipient: "",
  occasion: "",
  status: "",
  budgetMin: "",
  budgetMax: "",
};

function renderBar(overrides: Partial<Parameters<typeof GiftFiltersBar>[0]> = {}) {
  const onFiltersChange = jest.fn();
  const onSortChange = jest.fn();
  const onExpandToggle = jest.fn();
  render(
    <GiftFiltersBar
      filters={defaultFilters}
      onFiltersChange={onFiltersChange}
      sortField="dueDate"
      sortDir="asc"
      onSortChange={onSortChange}
      resultCount={5}
      expanded={false}
      onExpandToggle={onExpandToggle}
      {...overrides}
    />
  );
  return { onFiltersChange, onSortChange, onExpandToggle };
}

describe("GiftFiltersBar", () => {
  describe("rendering", () => {
    it("renders result count (expected use)", () => {
      renderBar({ resultCount: 3 });
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    });

    it("renders singular 'item' for count of 1 (edge case)", () => {
      renderBar({ resultCount: 1 });
      expect(screen.getByText(/1 item\b/i)).toBeInTheDocument();
    });

    it("renders the sort dropdown (expected use)", () => {
      renderBar();
      expect(screen.getByRole("combobox", { name: /sort registry list/i })).toBeInTheDocument();
    });

    it("renders the Filters toggle button (expected use)", () => {
      renderBar();
      expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument();
    });

    it("filter panel is hidden when expanded=false (expected use)", () => {
      renderBar({ expanded: false });
      expect(screen.getByRole("region", { name: /filter options/i })).not.toBeVisible();
    });

    it("filter panel is visible when expanded=true (expected use)", () => {
      renderBar({ expanded: true });
      expect(screen.getByRole("region", { name: /filter options/i })).toBeVisible();
    });
  });

  describe("filter interactions", () => {
    it("calls onExpandToggle when Filters button is clicked (expected use)", async () => {
      const { onExpandToggle } = renderBar();
      await userEvent.click(screen.getByRole("button", { name: /filters/i }));
      expect(onExpandToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onFiltersChange with updated recipient (expected use)", async () => {
      const { onFiltersChange } = renderBar({ expanded: true });
      await userEvent.type(
        screen.getByPlaceholderText(/filter by recipient/i),
        "Alice"
      );
      expect(onFiltersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ recipient: "Alice" })
      );
    });

    it("calls onFiltersChange with updated occasion (expected use)", async () => {
      const { onFiltersChange } = renderBar({ expanded: true });
      await userEvent.type(
        screen.getByPlaceholderText(/filter by occasion/i),
        "Christmas"
      );
      expect(onFiltersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ occasion: "Christmas" })
      );
    });

    it("calls onFiltersChange with updated status (expected use)", async () => {
      const { onFiltersChange } = renderBar({ expanded: true });
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /status/i }),
        "claimed"
      );
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: "claimed" })
      );
    });
  });

  describe("sort interactions", () => {
    it("calls onSortChange when sort field changes (expected use)", async () => {
      const { onSortChange } = renderBar();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /sort registry list/i }),
        "name"
      );
      expect(onSortChange).toHaveBeenCalledWith("name", "asc");
    });

    it("calls onSortChange toggling direction when direction button clicked (expected use)", async () => {
      const { onSortChange } = renderBar({ sortDir: "asc" });
      await userEvent.click(screen.getByRole("button", { name: /sort descending/i }));
      expect(onSortChange).toHaveBeenCalledWith("dueDate", "desc");
    });

    it("toggles direction from desc to asc (expected use)", async () => {
      const { onSortChange } = renderBar({ sortDir: "desc" });
      await userEvent.click(screen.getByRole("button", { name: /sort ascending/i }));
      expect(onSortChange).toHaveBeenCalledWith("dueDate", "asc");
    });
  });

  describe("aria attributes", () => {
    it("Filters button has aria-expanded=false when collapsed (expected use)", () => {
      renderBar({ expanded: false });
      expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      );
    });

    it("Filters button has aria-expanded=true when open (expected use)", () => {
      renderBar({ expanded: true });
      expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });
  });
});
