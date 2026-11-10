import { describe, expect, it } from "vitest";
import { parseFrontendConfiguration } from "./config.js";

describe("frontend configuration", () => {
  it("normalizes a valid API base URL", () => {
    expect(parseFrontendConfiguration({ VITE_API_BASE_URL: "http://localhost:4000/", VITE_DEMO_API_KEY: "demo-key" })).toEqual({
      apiBaseUrl: "http://localhost:4000",
      demoApiKey: "demo-key"
    });
  });

  it("rejects missing, malformed, and non-HTTP API URLs", () => {
    expect(() => parseFrontendConfiguration({ VITE_DEMO_API_KEY: "demo-key" })).to.throw(/VITE_API_BASE_URL is required/);
    expect(() => parseFrontendConfiguration({ VITE_API_BASE_URL: "not a URL", VITE_DEMO_API_KEY: "demo-key" })).to.throw(/valid URL/);
    expect(() => parseFrontendConfiguration({ VITE_API_BASE_URL: "file:///tmp/api", VITE_DEMO_API_KEY: "demo-key" })).to.throw(/HTTP or HTTPS/);
  });
});
