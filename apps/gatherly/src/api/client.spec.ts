import axios from "axios";
import { apiClient } from "./client";

describe("apiClient", () => {
  it("is an axios instance", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
  });

  it("has the correct default base URL", () => {
    expect(apiClient.defaults.baseURL).toBe(
      process.env.VITE_API_URL || "http://localhost:5001"
    );
  });

  it("has Content-Type header set to application/json", () => {
    const contentType =
      (apiClient.defaults.headers as any)["Content-Type"] ??
      (apiClient.defaults.headers?.common as any)?.["Content-Type"];
    expect(contentType).toBe("application/json");
  });

  it("has a 30 second timeout", () => {
    expect(apiClient.defaults.timeout).toBe(30000);
  });

  it("has request interceptors registered", () => {
    // Interceptor manager exposes handlers array
    const handlers = (apiClient.interceptors.request as any).handlers;
    expect(Array.isArray(handlers)).toBe(true);
    expect(handlers.length).toBeGreaterThan(0);
  });

  it("has response interceptors registered", () => {
    const handlers = (apiClient.interceptors.response as any).handlers;
    expect(Array.isArray(handlers)).toBe(true);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
