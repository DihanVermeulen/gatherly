/** Character limits for wishlist form fields */
export const WISHLIST_ITEM_NAME_MAX = 120;
export const WISHLIST_DESCRIPTION_MAX = 500;
export const PRODUCT_URL_MAX = 500;

export type WishlistFormErrors = Partial<{
  itemName: string;
  description: string;
  productUrl: string;
  priority: string;
  image: string;
}>;

/**
 * Validate product URL using native URL constructor.
 * Only allow http:// and https:// protocols to prevent XSS (javascript:, data: URLs).
 */
function validateProductUrl(url: string): boolean {
  if (!url.trim()) return true; // Optional field
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate wishlist form data. Returns object with field error messages.
 * Empty object = no errors.
 */
export function validateWishlistForm(data: {
  itemName: string;
  description: string;
  productUrl: string;
  priority: 'low' | 'medium' | 'high';
}): WishlistFormErrors {
  const errors: WishlistFormErrors = {};

  if (!data.itemName.trim()) {
    errors.itemName = "Item name is required.";
  } else if (data.itemName.length > WISHLIST_ITEM_NAME_MAX) {
    errors.itemName = `Item name must be ${WISHLIST_ITEM_NAME_MAX} characters or less.`;
  }

  if (data.description.length > WISHLIST_DESCRIPTION_MAX) {
    errors.description = `Description must be ${WISHLIST_DESCRIPTION_MAX} characters or less.`;
  }

  if (data.productUrl.length > PRODUCT_URL_MAX) {
    errors.productUrl = `URL must be ${PRODUCT_URL_MAX} characters or less.`;
  } else if (data.productUrl.trim() && !validateProductUrl(data.productUrl)) {
    errors.productUrl = "Please enter a valid http:// or https:// URL.";
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(data.priority)) {
    errors.priority = "Please select a valid priority level.";
  }

  return errors;
}

/** Returns true if there are no validation errors */
export function isWishlistFormValid(errors: WishlistFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
