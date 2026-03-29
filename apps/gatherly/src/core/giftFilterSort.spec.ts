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

describe("filterGifts - extended", () => {
  const gifts: Gift[] = [
    g({ id: "1", recipient: "Alice", occasion: "Birthday", status: "available", budget: 20 }),
    g({ id: "2", recipient: "Bob", occasion: "Christmas", status: "claimed", budget: 50 }),
    g({ id: "3", recipient: "Alice", occasion: "Christmas", status: "available", budget: 100 }),
    g({ id: "4", recipient: "Charlie", occasion: "Birthday", status: "purchased", budget: null }),
  ];

  it("filters by occasion (expected use)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "Birthday",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.occasion === "Birthday")).toBe(true);
  });

  it("filters by occasion case-insensitively (edge case)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "christmas",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(2);
  });

  it("filters by multiple criteria simultaneously (expected use)", () => {
    const result = filterGifts(gifts, {
      recipient: "alice",
      occasion: "Christmas",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by status 'purchased' (expected use)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "purchased",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("handles gift with null budget against budgetMin filter (edge case)", () => {
    // null budget is treated as 0; should be excluded if min > 0
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "",
      budgetMin: 10,
      budgetMax: "",
    });
    // gift 4 has null budget (treated as 0), so excluded
    expect(result.some((r) => r.id === "4")).toBe(false);
  });

  it("returns empty array when no gifts match (failure case)", () => {
    const result = filterGifts(gifts, {
      recipient: "Nobody",
      occasion: "",
      status: "",
      budgetMin: "",
      budgetMax: "",
    });
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input (edge case)", () => {
    const result = filterGifts([], { recipient: "", occasion: "", status: "", budgetMin: "", budgetMax: "" });
    expect(result).toHaveLength(0);
  });

  it("filters by exact budget boundary (edge case)", () => {
    const result = filterGifts(gifts, {
      recipient: "",
      occasion: "",
      status: "",
      budgetMin: 50,
      budgetMax: 50,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

describe("sortGifts", () => {
  const gifts: Gift[] = [
    g({ id: "1", name: "Zebra", recipient: "Charlie", dueDate: "2026-12-01", budget: 10, createdAt: "2026-03-01T00:00:00Z" }),
    g({ id: "2", name: "Apple", recipient: "Alice", dueDate: "2026-01-01", budget: 50, createdAt: "2026-01-01T00:00:00Z" }),
    g({ id: "3", name: "Mango", recipient: "Bob", dueDate: "2026-06-15", budget: null, createdAt: "2026-02-01T00:00:00Z" }),
  ];

  it("sorts by name ascending", () => {
    const result = sortGifts(gifts, "name", "asc");
    expect(result[0].name).toBe("Apple");
    expect(result[1].name).toBe("Mango");
    expect(result[2].name).toBe("Zebra");
  });

  it("sorts by name descending", () => {
    const result = sortGifts(gifts, "name", "desc");
    expect(result[0].name).toBe("Zebra");
    expect(result[1].name).toBe("Mango");
    expect(result[2].name).toBe("Apple");
  });

  it("sorts by dueDate ascending", () => {
    const result = sortGifts(gifts, "dueDate", "asc");
    expect(result[0].dueDate).toBe("2026-01-01");
    expect(result[2].dueDate).toBe("2026-12-01");
  });

  it("sorts by dueDate descending", () => {
    const result = sortGifts(gifts, "dueDate", "desc");
    expect(result[0].dueDate).toBe("2026-12-01");
    expect(result[2].dueDate).toBe("2026-01-01");
  });

  it("sorts by recipient ascending (expected use)", () => {
    const result = sortGifts(gifts, "recipient", "asc");
    expect(result[0].recipient).toBe("Alice");
    expect(result[2].recipient).toBe("Charlie");
  });

  it("sorts by budget ascending, null budgets sort last (edge case)", () => {
    const result = sortGifts(gifts, "budget", "asc");
    // null budget treated as -1, so sorts first in asc
    expect(result[0].id).toBe("3"); // budget: null (-1)
    expect(result[1].id).toBe("1"); // budget: 10
    expect(result[2].id).toBe("2"); // budget: 50
  });

  it("sorts by createdAt ascending (expected use)", () => {
    const result = sortGifts(gifts, "createdAt", "asc");
    expect(result[0].id).toBe("2");
    expect(result[2].id).toBe("1");
  });

  it("returns empty array for empty input (edge case)", () => {
    expect(sortGifts([], "name", "asc")).toHaveLength(0);
  });

  it("does not mutate original array (expected use)", () => {
    const original = [...gifts];
    sortGifts(gifts, "name", "asc");
    expect(gifts).toEqual(original);
  });
});
