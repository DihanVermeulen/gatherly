/** Gift status for registry list and filtering */
export type GiftStatus = "available" | "claimed" | "purchased" | "sent";

/** Who can see this gift in the registry */
export type GiftPrivacy = "everyone" | "santa_only" | "private";

export type Gift = {
  id: string;
  name: string;
  recipient: string;
  occasion: string;
  dueDate: string; // ISO date
  budget: number | null; // nullable for "no budget"
  storeLink: string;
  description: string;
  imageDataUrl: string | null; // base64 or null
  privacy: GiftPrivacy;
  status: GiftStatus;
  claimedBy?: string; // name when status is claimed/purchased/sent
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** Form uses empty string for "no budget" to allow controlled inputs */
export type GiftFormBudget = number | "";

export type GiftFormData = Omit<
  Gift,
  "id" | "status" | "createdAt" | "updatedAt" | "claimedBy" | "budget"
> & { budget: GiftFormBudget };

export type GiftSortField = "dueDate" | "name" | "recipient" | "budget" | "createdAt";
export type GiftSortDir = "asc" | "desc";

export type GiftFilters = {
  recipient: string;
  occasion: string;
  status: GiftStatus | "";
  budgetMin: number | "";
  budgetMax: number | "";
};
