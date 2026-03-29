import nock from "nock";
import { giftsApi } from "./gifts";

const BASE = "http://localhost:5001";
const EVENT_ID = "evt-1";
const GIFT_ID = "gift-1";

const mockGift = {
  id: GIFT_ID,
  name: "Headphones",
  description: "Sony WH-1000XM5",
  addedBy: "Alice",
  createdAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  nock.cleanAll();
});

describe("giftsApi", () => {
  describe("getAll", () => {
    it("returns gifts for an event (expected use)", async () => {
      nock(BASE)
        .get(`/api/events/${EVENT_ID}/gifts`)
        .reply(200, [mockGift]);
      const result = await giftsApi.getAll(EVENT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Headphones");
    });

    it("throws on server error (failure case)", async () => {
      nock(BASE).get(`/api/events/${EVENT_ID}/gifts`).reply(500);
      await expect(giftsApi.getAll(EVENT_ID)).rejects.toThrow();
    });
  });

  describe("add", () => {
    it("posts gift data and returns the created gift (expected use)", async () => {
      const newGift = { name: "Book", description: "A great read", addedBy: "Bob" };
      nock(BASE)
        .post(`/api/events/${EVENT_ID}/gifts`, newGift)
        .reply(201, { id: "gift-2", ...newGift });
      const result = await giftsApi.add(EVENT_ID, newGift);
      expect(result.id).toBe("gift-2");
      expect(result.name).toBe("Book");
    });

    it("throws on server error (failure case)", async () => {
      nock(BASE).post(`/api/events/${EVENT_ID}/gifts`).reply(500);
      await expect(giftsApi.add(EVENT_ID, { name: "Fail" })).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("puts updated fields and returns updated gift (expected use)", async () => {
      nock(BASE)
        .put(`/api/events/${EVENT_ID}/gifts/${GIFT_ID}`, { name: "Updated Name" })
        .reply(200, { ...mockGift, name: "Updated Name" });
      const result = await giftsApi.update(EVENT_ID, GIFT_ID, { name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
    });
  });

  describe("delete", () => {
    it("sends DELETE and resolves without data (expected use)", async () => {
      nock(BASE).delete(`/api/events/${EVENT_ID}/gifts/${GIFT_ID}`).reply(204);
      await expect(giftsApi.delete(EVENT_ID, GIFT_ID)).resolves.toBeUndefined();
    });

    it("throws on server error (failure case)", async () => {
      nock(BASE).delete(`/api/events/${EVENT_ID}/gifts/${GIFT_ID}`).reply(500);
      await expect(giftsApi.delete(EVENT_ID, GIFT_ID)).rejects.toThrow();
    });
  });

  describe("claim", () => {
    it("posts claimedBy to the claim endpoint (expected use)", async () => {
      nock(BASE)
        .post(`/api/events/${EVENT_ID}/gifts/${GIFT_ID}/claim`, { claimedBy: "Alice" })
        .reply(200);
      await expect(giftsApi.claim(EVENT_ID, GIFT_ID, "Alice")).resolves.toBeUndefined();
    });
  });

  describe("unclaim", () => {
    it("sends DELETE to the claim endpoint (expected use)", async () => {
      nock(BASE)
        .delete(`/api/events/${EVENT_ID}/gifts/${GIFT_ID}/claim`)
        .reply(200);
      await expect(giftsApi.unclaim(EVENT_ID, GIFT_ID)).resolves.toBeUndefined();
    });
  });
});
