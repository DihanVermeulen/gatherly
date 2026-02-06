import React from "react";
import type { GiftFilters, GiftSortField, GiftSortDir, GiftStatus } from "types/gift";
import { Filter, ArrowUpDown } from "lucide-react";

const STATUS_OPTIONS: { value: GiftStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "claimed", label: "Claimed" },
  { value: "purchased", label: "Purchased" },
  { value: "sent", label: "Sent" },
];

type GiftFiltersBarProps = {
  filters: GiftFilters;
  onFiltersChange: (f: GiftFilters) => void;
  sortField: GiftSortField;
  sortDir: GiftSortDir;
  onSortChange: (field: GiftSortField, dir: GiftSortDir) => void;
  resultCount: number;
  expanded: boolean;
  onExpandToggle: () => void;
};

const SORT_OPTIONS: { value: GiftSortField; label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "name", label: "Name" },
  { value: "recipient", label: "Recipient" },
  { value: "budget", label: "Budget" },
  { value: "createdAt", label: "Date added" },
];

export const GiftFiltersBar: React.FC<GiftFiltersBarProps> = ({
  filters,
  onFiltersChange,
  sortField,
  sortDir,
  onSortChange,
  resultCount,
  expanded,
  onExpandToggle,
}) => {
  const update = (u: Partial<GiftFilters>) => {
    onFiltersChange({ ...filters, ...u });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExpandToggle}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            aria-expanded={expanded}
            aria-controls="gift-filters-panel"
          >
            <Filter size={18} aria-hidden />
            Filters
          </button>
          <span className="text-sm text-gray-500" aria-live="polite">
            {resultCount} item{resultCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="gift-sort" className="text-sm text-gray-600 sr-only md:not-sr-only">
            Sort by
          </label>
          <select
            id="gift-sort"
            value={sortField}
            onChange={(e) => {
              const v = e.target.value as GiftSortField;
              onSortChange(v, sortDir);
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
            aria-label="Sort registry list"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onSortChange(sortField, sortDir === "asc" ? "desc" : "asc")
            }
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            aria-label={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
          >
            <ArrowUpDown size={18} />
          </button>
        </div>
      </div>

      <div
        id="gift-filters-panel"
        role="region"
        aria-label="Filter options"
        className={`mt-4 pt-4 border-t border-gray-100 ${expanded ? "block" : "hidden"}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-recipient" className="block text-xs font-medium text-gray-500 mb-1">
              Recipient
            </label>
            <input
              id="filter-recipient"
              type="text"
              placeholder="Filter by recipient"
              value={filters.recipient}
              onChange={(e) => update({ recipient: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label htmlFor="filter-occasion" className="block text-xs font-medium text-gray-500 mb-1">
              Occasion
            </label>
            <input
              id="filter-occasion"
              type="text"
              placeholder="Filter by occasion"
              value={filters.occasion}
              onChange={(e) => update({ occasion: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => update({ status: e.target.value as GiftStatus | "" })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="filter-budget-min" className="block text-xs font-medium text-gray-500 mb-1">
                Budget min
              </label>
              <input
                id="filter-budget-min"
                type="number"
                min={0}
                step={1}
                placeholder="Min"
                value={filters.budgetMin === "" ? "" : filters.budgetMin}
                onChange={(e) =>
                  update({
                    budgetMin: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="filter-budget-max" className="block text-xs font-medium text-gray-500 mb-1">
                Budget max
              </label>
              <input
                id="filter-budget-max"
                type="number"
                min={0}
                step={1}
                placeholder="Max"
                value={filters.budgetMax === "" ? "" : filters.budgetMax}
                onChange={(e) =>
                  update({
                    budgetMax: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
