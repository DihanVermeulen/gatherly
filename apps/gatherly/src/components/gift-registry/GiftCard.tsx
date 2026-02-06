import React from "react";
import type { Gift } from "types/gift";
import { Edit2, Trash2, Package, Heart, User } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatBudget(budget: number | null): string {
  if (budget === null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(budget);
}

const STATUS_LABELS: Record<Gift["status"], string> = {
  available: "Available",
  claimed: "Claimed",
  purchased: "Purchased",
  sent: "Sent",
};

type GiftCardProps = {
  gift: Gift;
  onEdit: (gift: Gift) => void;
  onDelete: (gift: Gift) => void;
  onMarkPurchased?: (gift: Gift) => void;
  onMarkSent?: (gift: Gift) => void;
  onClaim?: (gift: Gift) => void;
};

export const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  onEdit,
  onDelete,
  onMarkPurchased,
  onMarkSent,
  onClaim,
}) => {
  const canInteract =
    gift.status === "available" &&
    (onClaim ?? onMarkPurchased ?? onMarkSent);

  return (
    <article
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
      aria-labelledby={`gift-title-${gift.id}`}
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {gift.imageDataUrl ? (
          <img
            src={gift.imageDataUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-gray-400"
            aria-hidden
          >
            <Package size={48} />
          </div>
        )}
        {gift.status !== "available" && (
          <span
            className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-white"
            aria-label={`Status: ${STATUS_LABELS[gift.status]}`}
          >
            {gift.status === "claimed" && gift.claimedBy
              ? `Claimed by ${gift.claimedBy}`
              : STATUS_LABELS[gift.status].toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3
          id={`gift-title-${gift.id}`}
          className="font-semibold text-gray-900 text-lg line-clamp-2"
        >
          {gift.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
          <User size={14} aria-hidden />
          <span>{gift.recipient}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {gift.occasion} · Due {formatDate(gift.dueDate)}
        </p>
        {gift.budget !== null && (
          <p className="text-sm text-gray-600 mt-1">
            {formatBudget(gift.budget)}
          </p>
        )}
        {gift.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {gift.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(gift)}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            aria-label={`Edit ${gift.name}`}
          >
            <Edit2 size={16} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(gift)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            aria-label={`Delete ${gift.name}`}
          >
            <Trash2 size={16} />
            Delete
          </button>
          {canInteract && (
            <>
              {onClaim && (
                <button
                  type="button"
                  onClick={() => onClaim(gift)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                  aria-label={`I'm buying this: ${gift.name}`}
                >
                  <Heart size={16} />
                  I'm buying this
                </button>
              )}
              {onMarkPurchased && gift.status === "claimed" && (
                <button
                  type="button"
                  onClick={() => onMarkPurchased(gift)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Mark as purchased
                </button>
              )}
              {onMarkSent && (gift.status === "claimed" || gift.status === "purchased") && (
                <button
                  type="button"
                  onClick={() => onMarkSent(gift)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Mark as sent
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
};
