/** Character limits for gift form fields (aligned with UI specs) */
export const GIFT_NAME_MAX = 120;
export const RECIPIENT_MAX = 80;
export const OCCASION_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const STORE_LINK_MAX = 500;
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 999_999.99;

export type GiftFormErrors = Partial<{
  name: string;
  recipient: string;
  occasion: string;
  dueDate: string;
  budget: string;
  storeLink: string;
  description: string;
  image: string;
  privacy: string;
}>;

function asNumber(value: number | ""): number | null {
  if (value === "" || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Real-time validation for the gift form.
 * Returns an object of field keys to error messages (empty string = no error).
 */
export function validateGiftForm(data: {
  name: string;
  recipient: string;
  occasion: string;
  dueDate: string;
  budget: number | "";
  storeLink: string;
  description: string;
  imageDataUrl: string | null;
  privacy: string;
}): GiftFormErrors {
  const errors: GiftFormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Gift name is required.";
  } else if (data.name.length > GIFT_NAME_MAX) {
    errors.name = `Gift name must be ${GIFT_NAME_MAX} characters or less.`;
  }

  if (!data.recipient.trim()) {
    errors.recipient = "Recipient is required.";
  } else if (data.recipient.length > RECIPIENT_MAX) {
    errors.recipient = `Recipient must be ${RECIPIENT_MAX} characters or less.`;
  }

  if (!data.occasion.trim()) {
    errors.occasion = "Occasion is required.";
  } else if (data.occasion.length > OCCASION_MAX) {
    errors.occasion = `Occasion must be ${OCCASION_MAX} characters or less.`;
  }

  if (!data.dueDate.trim()) {
    errors.dueDate = "Due date is required.";
  } else {
    const date = new Date(data.dueDate);
    if (Number.isNaN(date.getTime())) {
      errors.dueDate = "Please enter a valid date.";
    }
  }

  const budget = asNumber(data.budget);
  if (budget !== null && (budget < BUDGET_MIN || budget > BUDGET_MAX)) {
    errors.budget = `Budget must be between ${BUDGET_MIN} and ${BUDGET_MAX}.`;
  }

  if (data.storeLink.length > STORE_LINK_MAX) {
    errors.storeLink = `Store link must be ${STORE_LINK_MAX} characters or less.`;
  }
  if (data.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or less.`;
  }

  const validPrivacies = ["everyone", "santa_only", "private"];
  if (data.privacy && !validPrivacies.includes(data.privacy)) {
    errors.privacy = "Please select a valid privacy option.";
  }

  return errors;
}

/** Returns true if there are no validation errors */
export function isGiftFormValid(errors: GiftFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
