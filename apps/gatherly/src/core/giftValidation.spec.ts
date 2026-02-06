import {
  validateGiftForm,
  isGiftFormValid,
  GIFT_NAME_MAX,
  DESCRIPTION_MAX,
} from "./giftValidation";

describe("giftValidation", () => {
  const validData = {
    name: "Wireless Headphones",
    recipient: "Jane",
    occasion: "Christmas",
    dueDate: "2026-12-25",
    budget: 50 as number | "",
    storeLink: "https://example.com",
    description: "Sony WH-1000XM5",
    imageDataUrl: null as string | null,
    privacy: "everyone",
  };

  describe("validateGiftForm", () => {
    it("returns no errors for valid form data (expected use)", () => {
      const errors = validateGiftForm(validData);
      expect(errors).toEqual({});
    });

    it("returns errors for missing required fields (failure case)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "",
        recipient: "",
        occasion: "",
        dueDate: "",
      });
      expect(errors.name).toBeDefined();
      expect(errors.recipient).toBeDefined();
      expect(errors.occasion).toBeDefined();
      expect(errors.dueDate).toBeDefined();
    });

    it("returns error when gift name exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "a".repeat(GIFT_NAME_MAX + 1),
      });
      expect(errors.name).toContain(String(GIFT_NAME_MAX));
    });

    it("returns error when description exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        description: "a".repeat(DESCRIPTION_MAX + 1),
      });
      expect(errors.description).toBeDefined();
    });

    it("returns error for invalid due date (failure case)", () => {
      const errors = validateGiftForm({
        ...validData,
        dueDate: "not-a-date",
      });
      expect(errors.dueDate).toBeDefined();
    });

    it("returns error when budget is out of range (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        budget: -1,
      });
      expect(errors.budget).toBeDefined();
    });
  });

  describe("isGiftFormValid", () => {
    it("returns true when errors object is empty", () => {
      expect(isGiftFormValid({})).toBe(true);
    });

    it("returns false when errors exist", () => {
      expect(isGiftFormValid({ name: "Required" })).toBe(false);
    });
  });
});
