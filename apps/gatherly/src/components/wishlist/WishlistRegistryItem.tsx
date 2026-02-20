import { Gift, CheckCircle, Loader2 } from "lucide-react";
import type { WishlistItem } from "../../api/events";

type WishlistRegistryItemProps = {
  item: WishlistItem;
  onClaim?: () => void;
  onUnclaim?: () => void;
  isPending?: boolean;
};

export function WishlistRegistryItem({
  item,
  onClaim,
  onUnclaim,
  isPending,
}: WishlistRegistryItemProps) {
  // State 2: Claimed by someone else — greyed out, no action
  if (item.isClaimed && !item.claimedByMe) {
    return (
      <div className="flex bg-gray-50 dark:bg-[#0d1b12]/50 p-3 rounded-xl gap-4 border border-gray-100 dark:border-gray-800 opacity-80">
        {/* Thumbnail - Claimed (Grayscale) */}
        {item.imageUrl ? (
          <div
            className="size-20 rounded-lg bg-cover bg-center shrink-0 grayscale"
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          />
        ) : (
          <div className="size-20 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 grayscale">
            <Gift className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col justify-between flex-1 py-1">
          <div>
            <p className="text-sm font-bold text-gray-400">{item.itemName}</p>
            {item.description && (
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
          </div>

          {/* Claimed Badge */}
          <div className="mt-2 flex items-center gap-1.5 text-gray-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-bold">Claimed</span>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Claimed by me — normal appearance with green badge and unclaim button
  if (item.isClaimed && item.claimedByMe) {
    return (
      <div className="flex bg-white dark:bg-[#1a2e20] p-3 rounded-xl gap-4 shadow-sm border border-green-100 dark:border-green-900">
        {/* Thumbnail */}
        {item.imageUrl ? (
          <div
            className="size-20 rounded-lg bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          />
        ) : (
          <div className="size-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Gift className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col justify-between flex-1 py-1">
          <div>
            <p className="text-sm font-bold">{item.itemName}</p>
            {item.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
            {item.priority === "high" && (
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
                HIGH PRIORITY
              </p>
            )}
          </div>

          {/* You're buying this badge + Unclaim button */}
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-bold">You're buying this</span>
            </div>
            <button
              onClick={onUnclaim}
              disabled={isPending}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline self-start transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Unclaim"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Available — show claim button
  return (
    <div className="flex bg-white dark:bg-[#1a2e20] p-3 rounded-xl gap-4 shadow-sm border border-gray-100 dark:border-gray-800">
      {/* Thumbnail - Unclaimed */}
      {item.imageUrl ? (
        <div
          className="size-20 rounded-lg bg-cover bg-center shrink-0"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
        />
      ) : (
        <div className="size-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          <Gift className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col justify-between flex-1 py-1">
        <div>
          <p className="text-sm font-bold">{item.itemName}</p>
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
          {item.priority === "high" && (
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
              HIGH PRIORITY
            </p>
          )}
        </div>

        {/* Claim Button */}
        <button
          onClick={onClaim}
          disabled={!onClaim || isPending}
          className="mt-2 h-8 rounded-lg bg-secondary-0 text-black text-xs font-bold px-4 self-start hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "I'll buy this"
          )}
        </button>
      </div>
    </div>
  );
}
