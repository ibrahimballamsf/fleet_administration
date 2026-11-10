import { expect } from "chai";
import { createApiKeyMiddleware } from "../../src/middleware/api-key.js";
import { createReadinessHandler } from "../../src/readiness.js";

function invokeApiKey(header) {
  let nextValue;
  const request = { get: (name) => name === "x-api-key" ? header : undefined };
  createApiKeyMiddleware(["valid-key"])(request, {}, (value) => { nextValue = value; });
  return { request, nextValue };
}

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

describe("API Gateway unit tests", () => {
  it("rejects requests without an API key", () => {
    const { nextValue } = invokeApiKey(undefined);
    expect(nextValue.code).to.equal("UNAUTHORIZED");
  });

  it("rejects invalid keys and fingerprints valid keys for rate limiting", () => {
    const invalid = invokeApiKey("wrong-key");
    expect(invalid.nextValue.code).to.equal("FORBIDDEN");

    const valid = invokeApiKey("valid-key");
    expect(valid.nextValue).to.equal(undefined);
    expect(valid.request.apiKeyHash).to.match(/^[a-f0-9]{64}$/);
  });

  it("reports ready only when every downstream service is available", async () => {
    const response = fakeResponse();
    const handler = createReadinessHandler({
      services: { users: "http://users.test", vehicles: "http://vehicles.test" },
      fetchImplementation: async () => ({ ok: true })
    });
    await handler({}, response);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data).to.deep.equal({
      service: "gateway",
      status: "ready",
      services: { users: { status: "available" }, vehicles: { status: "available" } }
    });
  });

  it("returns a degraded response without leaking downstream errors", async () => {
    const response = fakeResponse();
    const handler = createReadinessHandler({
      services: { users: "http://users.test", vehicles: "http://vehicles.test" },
      fetchImplementation: async (url) => {
        if (url.hostname === "vehicles.test") throw new Error("private network detail");
        return { ok: true };
      }
    });
    await handler({}, response);

    expect(response.statusCode).to.equal(503);
    expect(response.body.data.status).to.equal("degraded");
    expect(response.body.data.services.vehicles).to.deep.equal({ status: "unavailable" });
    expect(JSON.stringify(response.body)).not.to.include("private network detail");
  });
});
