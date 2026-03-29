import {
  validateGiftForm,
  isGiftFormValid,
  GIFT_NAME_MAX,
  RECIPIENT_MAX,
  OCCASION_MAX,
  DESCRIPTION_MAX,
  STORE_LINK_MAX,
  BUDGET_MIN,
  BUDGET_MAX,
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

    it("returns error when recipient exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        recipient: "a".repeat(RECIPIENT_MAX + 1),
      });
      expect(errors.recipient).toContain(String(RECIPIENT_MAX));
    });

    it("returns error when occasion exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        occasion: "a".repeat(OCCASION_MAX + 1),
      });
      expect(errors.occasion).toContain(String(OCCASION_MAX));
    });

    it("returns error when store link exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        storeLink: "a".repeat(STORE_LINK_MAX + 1),
      });
      expect(errors.storeLink).toBeDefined();
    });

    it("does not return budget error when budget is empty string (expected use)", () => {
      const errors = validateGiftForm({ ...validData, budget: "" });
      expect(errors.budget).toBeUndefined();
    });

    it("does not return budget error when budget is exactly at max (boundary)", () => {
      const errors = validateGiftForm({ ...validData, budget: BUDGET_MAX });
      expect(errors.budget).toBeUndefined();
    });

    it("returns budget error when budget exceeds max (boundary)", () => {
      const errors = validateGiftForm({ ...validData, budget: BUDGET_MAX + 0.01 });
      expect(errors.budget).toBeDefined();
    });

    it("does not return budget error when budget is exactly at min (boundary)", () => {
      const errors = validateGiftForm({ ...validData, budget: BUDGET_MIN });
      expect(errors.budget).toBeUndefined();
    });

    it("returns error for invalid privacy option (failure case)", () => {
      const errors = validateGiftForm({ ...validData, privacy: "unknown_value" });
      expect(errors.privacy).toBeDefined();
    });

    it("accepts all valid privacy options (expected use)", () => {
      for (const privacy of ["everyone", "santa_only", "private"]) {
        const errors = validateGiftForm({ ...validData, privacy });
        expect(errors.privacy).toBeUndefined();
      }
    });

    it("accepts empty privacy without error (no selection)", () => {
      const errors = validateGiftForm({ ...validData, privacy: "" });
      expect(errors.privacy).toBeUndefined();
    });

    it("accumulates multiple errors simultaneously (combined failure)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "",
        recipient: "",
        occasion: "",
        dueDate: "",
        description: "a".repeat(DESCRIPTION_MAX + 1),
      });
      expect(errors.name).toBeDefined();
      expect(errors.recipient).toBeDefined();
      expect(errors.occasion).toBeDefined();
      expect(errors.dueDate).toBeDefined();
      expect(errors.description).toBeDefined();
    });

    it("trims whitespace when checking required fields (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "   ",
        recipient: "  ",
        occasion: "\t",
        dueDate: " ",
      });
      expect(errors.name).toBeDefined();
      expect(errors.recipient).toBeDefined();
      expect(errors.occasion).toBeDefined();
      expect(errors.dueDate).toBeDefined();
    });

    it("accepts name at exactly the max length (boundary)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "a".repeat(GIFT_NAME_MAX),
      });
      expect(errors.name).toBeUndefined();
    });
  });

  describe("isGiftFormValid", () => {
    it("returns true when errors object is empty", () => {
      expect(isGiftFormValid({})).toBe(true);
    });

    it("returns false when errors exist", () => {
      expect(isGiftFormValid({ name: "Required" })).toBe(false);
    });

    it("returns false for a fully invalid form", () => {
      const errors = validateGiftForm({
        name: "",
        recipient: "",
        occasion: "",
        dueDate: "",
        budget: "",
        storeLink: "",
        description: "",
        imageDataUrl: null,
        privacy: "everyone",
      });
      expect(isGiftFormValid(errors)).toBe(false);
    });

    it("returns true for a fully valid form", () => {
      const errors = validateGiftForm(validData);
      expect(isGiftFormValid(errors)).toBe(true);
    });
  });
});
