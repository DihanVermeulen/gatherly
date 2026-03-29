import nock from "nock";
import { eventsApi } from "./events";

const BASE = "http://localhost:5001";

const mockEvent = {
  id: "evt-1",
  name: "Christmas 2026",
  people: ["Alice", "Bob"],
  couples: [],
  assignments: null,
  coupleCrossing: false,
  gifts: {},
  date: "2026-12-25",
  participants: ["Alice", "Bob"],
};

afterEach(() => {
  nock.cleanAll();
});

describe("eventsApi", () => {
  describe("getAll", () => {
    it("returns array of events (expected use)", async () => {
      nock(BASE).get("/api/events").reply(200, [mockEvent]);
      const result = await eventsApi.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("evt-1");
    });

    it("throws on server error (failure case)", async () => {
      nock(BASE).get("/api/events").reply(500);
      await expect(eventsApi.getAll()).rejects.toThrow();
    });
  });

  describe("getById", () => {
    it("returns a single event by id (expected use)", async () => {
      nock(BASE).get("/api/events/evt-1").reply(200, mockEvent);
      const result = await eventsApi.getById("evt-1");
      expect(result.id).toBe("evt-1");
      expect(result.name).toBe("Christmas 2026");
    });

    it("throws on 404 (failure case)", async () => {
      nock(BASE).get("/api/events/missing").reply(404);
      await expect(eventsApi.getById("missing")).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("posts name and coupleCrossing and returns event (expected use)", async () => {
      nock(BASE)
        .post("/api/events", { name: "New Event", coupleCrossing: false })
        .reply(201, { ...mockEvent, name: "New Event" });
      const result = await eventsApi.create("New Event");
      expect(result.name).toBe("New Event");
    });

    it("sends coupleCrossing=true when specified (expected use)", async () => {
      nock(BASE)
        .post("/api/events", { name: "Party", coupleCrossing: true })
        .reply(201, { ...mockEvent, name: "Party", coupleCrossing: true });
      const result = await eventsApi.create("Party", true);
      expect(result.coupleCrossing).toBe(true);
    });
  });

  describe("update", () => {
    it("puts partial event data and returns updated event (expected use)", async () => {
      nock(BASE)
        .put("/api/events/evt-1", { name: "Updated" })
        .reply(200, { ...mockEvent, name: "Updated" });
      const result = await eventsApi.update("evt-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("sends DELETE request without returning data (expected use)", async () => {
      nock(BASE).delete("/api/events/evt-1").reply(204);
      await expect(eventsApi.delete("evt-1")).resolves.toBeUndefined();
    });

    it("throws on server error (failure case)", async () => {
      nock(BASE).delete("/api/events/evt-1").reply(500);
      await expect(eventsApi.delete("evt-1")).rejects.toThrow();
    });
  });

  describe("addParticipant", () => {
    it("posts participant name to event (expected use)", async () => {
      nock(BASE)
        .post("/api/events/evt-1/participants", { name: "Alice" })
        .reply(200);
      await expect(
        eventsApi.addParticipant("evt-1", "Alice")
      ).resolves.toBeUndefined();
    });
  });

  describe("removeParticipant", () => {
    it("sends DELETE for encoded participant name (expected use)", async () => {
      nock(BASE)
        .delete("/api/events/evt-1/participants/Alice%20Smith")
        .reply(200);
      await expect(
        eventsApi.removeParticipant("evt-1", "Alice Smith")
      ).resolves.toBeUndefined();
    });
  });

  describe("addCouple", () => {
    it("posts two person names (expected use)", async () => {
      nock(BASE)
        .post("/api/events/evt-1/couples", { person1: "Alice", person2: "Bob" })
        .reply(200);
      await expect(
        eventsApi.addCouple("evt-1", "Alice", "Bob")
      ).resolves.toBeUndefined();
    });
  });

  describe("removeCouple", () => {
    it("sends DELETE for couple id (expected use)", async () => {
      nock(BASE).delete("/api/events/evt-1/couples/couple-1").reply(200);
      await expect(
        eventsApi.removeCouple("evt-1", "couple-1")
      ).resolves.toBeUndefined();
    });
  });

  describe("generateAssignments", () => {
    it("posts giftCount and returns assignments (expected use)", async () => {
      const assignments = { Alice: ["Bob"], Bob: ["Alice"] };
      nock(BASE)
        .post("/api/events/evt-1/generate", { giftCount: 1 })
        .reply(200, { assignments });
      const result = await eventsApi.generateAssignments("evt-1", 1);
      expect(result.assignments).toEqual(assignments);
    });
  });

  describe("getCodes", () => {
    it("returns assignments and codes (expected use)", async () => {
      const data = {
        assignments: { Alice: ["Bob"] },
        codes: { Alice: "abc123" },
      };
      nock(BASE).get("/api/events/evt-1/codes").reply(200, data);
      const result = await eventsApi.getCodes("evt-1");
      expect(result.codes).toEqual(data.codes);
      expect(result.assignments).toEqual(data.assignments);
    });
  });
});
