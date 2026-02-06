import React, { useMemo, useState, useCallback } from "react";
import { useGifts } from "contexts/GiftsContext";
import { filterGifts, sortGifts } from "core/giftFilterSort";
import type { Gift, GiftFilters, GiftSortField, GiftSortDir } from "types/gift";
import { GiftCard } from "./GiftCard";
import { GiftFiltersBar } from "./GiftFiltersBar";
import { Plus } from "lucide-react";

const DEFAULT_FILTERS: GiftFilters = {
  recipient: "",
  occasion: "",
  status: "",
  budgetMin: "",
  budgetMax: "",
};

type RegistryListProps = {
  onEditGift: (gift: Gift) => void;
  onScrollToCreate: () => void;
  /** Optional: name of current user for "I'm buying this" (claim) */
  currentUserName?: string | null;
};

export const RegistryList: React.FC<RegistryListProps> = ({
  onEditGift,
  onScrollToCreate,
  currentUserName = null,
}) => {
  const { state, dispatch } = useGifts();
  const [filters, setFilters] = useState<GiftFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<GiftSortField>("dueDate");
  const [sortDir, setSortDir] = useState<GiftSortDir>("asc");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Gift | null>(null);

  const filtered = useMemo(
    () => filterGifts(state.gifts, filters),
    [state.gifts, filters]
  );
  const sorted = useMemo(
    () => sortGifts(filtered, sortField, sortDir),
    [filtered, sortField, sortDir]
  );

  const handleSort = useCallback((field: GiftSortField, dir: GiftSortDir) => {
    setSortField(field);
    setSortDir(dir);
  }, []);

  const handleDelete = useCallback((gift: Gift) => {
    setDeleteConfirm(gift);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      dispatch({ type: "DELETE_GIFT", payload: deleteConfirm.id });
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, dispatch]);

  const handleClaim = useCallback(
    (gift: Gift) => {
      dispatch({
        type: "UPDATE_GIFT",
        payload: {
          ...gift,
          status: "claimed",
          claimedBy: currentUserName ?? "Someone",
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [dispatch, currentUserName]
  );

  const handleMarkPurchased = useCallback(
    (gift: Gift) => {
      dispatch({
        type: "UPDATE_GIFT",
        payload: {
          ...gift,
          status: "purchased",
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [dispatch]
  );

  const handleMarkSent = useCallback(
    (gift: Gift) => {
      dispatch({
        type: "UPDATE_GIFT",
        payload: {
          ...gift,
          status: "sent",
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [dispatch]
  );

  return (
    <section
      aria-labelledby="registry-list-heading"
      className="bg-white/95 rounded-xl border border-red-100 shadow-sm overflow-hidden"
    >
      <div className="p-4 border-b border-gray-100">
        <h2 id="registry-list-heading" className="text-xl font-semibold text-gray-900">
          Registry List
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <GiftFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={handleSort}
          resultCount={sorted.length}
          expanded={filtersExpanded}
          onExpandToggle={() => setFiltersExpanded((e) => !e)}
        />

        {sorted.length === 0 ? (
          <div
            className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
            role="status"
            aria-label="No gifts in registry"
          >
            <p className="text-gray-600 font-medium mb-2">
              {state.gifts.length === 0
                ? "No gifts yet"
                : "No gifts match your filters"}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {state.gifts.length === 0
                ? "Create your first gift to get started."
                : "Try adjusting filters or clear them to see all gifts."}
            </p>
            <button
              type="button"
              onClick={onScrollToCreate}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors"
            >
              <Plus size={20} aria-hidden />
              Create First Gift
            </button>
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0"
            aria-label="Gift registry cards"
          >
            {sorted.map((gift) => (
              <li key={gift.id}>
                <GiftCard
                  gift={gift}
                  onEdit={onEditGift}
                  onDelete={handleDelete}
                  onClaim={currentUserName ? handleClaim : undefined}
                  onMarkPurchased={handleMarkPurchased}
                  onMarkSent={handleMarkSent}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
              Delete gift?
            </h3>
            <p className="text-gray-600 mb-6">
              “{deleteConfirm.name}” will be removed from the registry. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
