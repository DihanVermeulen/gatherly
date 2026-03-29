import nock from "nock";
import { decipherApi } from "./decipher";

const BASE = "http://localhost:5001";

afterEach(() => {
  nock.cleanAll();
});

describe("decipherApi", () => {
  describe("decipher", () => {
    it("posts a code and returns person with receivers (expected use)", async () => {
      const mockResult = { person: "Alice", receivers: ["Bob", "Charlie"] };
      nock(BASE)
        .post("/api/decipher", { code: "abc123" })
        .reply(200, mockResult);
      const result = await decipherApi.decipher("abc123");
      expect(result.person).toBe("Alice");
      expect(result.receivers).toEqual(["Bob", "Charlie"]);
    });

    it("throws on invalid code / server error (failure case)", async () => {
      nock(BASE).post("/api/decipher").reply(400, { error: "Invalid code" });
      await expect(decipherApi.decipher("bad-code")).rejects.toThrow();
    });

    it("throws on network error (failure case)", async () => {
      nock(BASE).post("/api/decipher").replyWithError("Network failure");
      await expect(decipherApi.decipher("any")).rejects.toThrow();
    });
  });
});
