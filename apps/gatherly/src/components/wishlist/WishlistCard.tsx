import { Gift } from 'lucide-react';
import type { WishlistItem } from '../../api/events';

type WishlistCardProps = {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
};

export function WishlistCard({ item, onEdit }: WishlistCardProps) {
  const priorityLabels = {
    high: 'HIGH PRIORITY',
    medium: 'MEDIUM PRIORITY',
    low: 'LOW PRIORITY',
  };

  const priorityClasses = {
    high: 'text-[10px] font-bold text-primary uppercase tracking-wider mt-1',
    medium: 'text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1',
    low: 'text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1',
  };

  return (
    <div className="flex flex-col w-44 shrink-0 rounded-xl bg-white dark:bg-[#1a2e20] shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
      {/* Image Section */}
      {item.imageUrl ? (
        <div
          className="w-full aspect-square bg-center bg-no-repeat bg-cover"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
        />
      ) : (
        <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Gift className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-sm font-bold leading-tight truncate">{item.itemName}</p>
          <p className={priorityClasses[item.priority]}>{priorityLabels[item.priority]}</p>
        </div>

        {/* Edit Button */}
        <button
          onClick={() => onEdit(item)}
          className="w-full flex items-center justify-center rounded-lg h-8 bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
