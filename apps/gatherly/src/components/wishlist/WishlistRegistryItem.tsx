import { Gift, CheckCircle } from 'lucide-react';
import type { WishlistItem } from '../../api/events';

type WishlistRegistryItemProps = {
  item: WishlistItem;
  isClaimed: boolean;
  onClaim?: () => void;
};

export function WishlistRegistryItem({ item, isClaimed, onClaim }: WishlistRegistryItemProps) {
  if (isClaimed) {
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
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">{item.description}</p>
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

  // Unclaimed state
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
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
          )}
          {item.priority === 'high' && (
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
              HIGH PRIORITY
            </p>
          )}
        </div>

        {/* Claim Button */}
        <button
          onClick={onClaim}
          disabled={!onClaim}
          className="mt-2 h-8 rounded-lg bg-primary text-[#0d1b12] text-xs font-bold px-4 self-start hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I'll buy this
        </button>
      </div>
    </div>
  );
}
