import { filterGifts, sortGifts } from "./giftFilterSort";
import type { Gift } from "types/gift";

const baseGift: Gift = {
  id: "1",
  name: "Gift A",
  recipient: "Alice",
  occasion: "Birthday",
  dueDate: "2026-06-01",
  budget: 30,
  storeLink: "",
  description: "",
  imageDataUrl: null,
  privacy: "everyone",
  status: "available",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function g(overrides: Partial<Gift> & { id: string }): Gift {
  return { ...baseGift, ...overrides };
}

describe("filterGifts", () => {
  const gifts: Gift[] = [
    g({ id: "1", recipient: "Alice", occasion: "Birthday", status: "available", budget: 20 }),
    g({ id: "2", recipient: "Bob", occasion: "Christmas", status: "claimed", budget: 50 }),
    g({ id: "3", recipient: "Alice", occasion: "Christmas", status: "available", budget: 100 }),
  ];

  it("returns all gifts when filters are empty (expected use)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(3);
  });

  it("filters by recipient", () => {
    const result = filterGifts(gifts, {
      recipient: "alice",
      occasion: "",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.recipient === "Alice")).toBe(true);
  });

  it("filters by status", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "claimed",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by budget range (edge case)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "",
      budgetMin: 25,
      budgetMax: 75,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

describe("sortGifts", () => {
  const gifts: Gift[] = [
    g({ id: "1", name: "Zebra", dueDate: "2026-12-01", budget: 10 }),
    g({ id: "2", name: "Apple", dueDate: "2026-01-01", budget: 50 }),
  ];

  it("sorts by name ascending", () => {
    const result = sortGifts(gifts, "name", "asc");
    expect(result[0].name).toBe("Apple");
    expect(result[1].name).toBe("Zebra");
  });

  it("sorts by name descending", () => {
    const result = sortGifts(gifts, "name", "desc");
    expect(result[0].name).toBe("Zebra");
    expect(result[1].name).toBe("Apple");
  });

  it("sorts by dueDate ascending", () => {
    const result = sortGifts(gifts, "dueDate", "asc");
    expect(result[0].dueDate).toBe("2026-01-01");
  });
});
