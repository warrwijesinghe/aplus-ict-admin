import { describe, expect, it } from "vitest";
import { api } from "../src/api/client.js";

describe("admin API client", () => {
  it("uses the configured API URL and preserves credential support", () => {
    expect(api.defaults.baseURL).toBe(import.meta.env.VITE_API_URL || "http://localhost:4000");
    expect(api.defaults.withCredentials).toBe(true);
  });
});
