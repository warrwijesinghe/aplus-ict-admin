import { describe, expect, it } from "vitest";
import { api, apiOrigin } from "../src/api/client.js";

describe("admin API client", () => {
  it("uses the configured API URL and preserves credential support", () => {
    expect(api.defaults.baseURL).toBe(apiOrigin(import.meta.env.VITE_API_URL || "http://localhost:4000"));
    expect(api.defaults.withCredentials).toBe(true);
  });
  it("does not duplicate the API prefix in same-origin or full API URLs", () => {
    expect(apiOrigin('/api')).toBe('');
    expect(apiOrigin('https://api.example.test/api/')).toBe('https://api.example.test');
    expect(apiOrigin('https://api.example.test')).toBe('https://api.example.test');
  });
});
