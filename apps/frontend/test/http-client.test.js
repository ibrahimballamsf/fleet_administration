import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createApiClient } from "../src/api/http-client.js";

function jsonResponse(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    status: options.status ?? 200,
    headers: { "content-type": "application/json", ...options.headers }
  });
}

test("adds gateway authentication, query parameters, and JSON request bodies", async () => {
  let captured;
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    apiKey: "test-api-key",
    getAccessToken: () => "test-jwt",
    fetchImplementation: async (url, options) => {
      captured = { url, options };
      return jsonResponse({ data: { ok: true }, meta: {} });
    }
  });

  const result = await client.request("api/vehicles", {
    method: "POST",
    query: { page: 2, omitted: undefined },
    body: { registrationNumber: "BE-123-XY" }
  });

  assert.equal(captured.url.toString(), "http://gateway.test/api/vehicles?page=2");
  assert.equal(captured.options.headers["X-API-Key"], "test-api-key");
  assert.equal(captured.options.headers.Authorization, "Bearer test-jwt");
  assert.equal(captured.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(captured.options.body), { registrationNumber: "BE-123-XY" });
  assert.deepEqual(result.data, { ok: true });
});

test("allows public login requests without a JWT", async () => {
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    apiKey: "test-api-key",
    getAccessToken: () => null,
    fetchImplementation: async (_url, options) => {
      assert.equal(options.headers.Authorization, undefined);
      return jsonResponse({ data: { token: "issued-token" }, meta: {} });
    }
  });

  const response = await client.request("api/users/login", {
    method: "POST",
    body: { email: "admin@example.com", password: "password" },
    authenticated: false
  });
  assert.equal(response.data.token, "issued-token");
});

test("fails protected requests before the network when no session exists", async () => {
  let called = false;
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    apiKey: "test-api-key",
    getAccessToken: () => null,
    fetchImplementation: async () => {
      called = true;
      return jsonResponse({});
    }
  });

  await assert.rejects(
    client.request("api/vehicles"),
    (error) => error instanceof ApiError && error.code === "AUTHENTICATION_REQUIRED" && error.status === 401
  );
  assert.equal(called, false);
});

test("normalizes gateway error envelopes", async () => {
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    apiKey: "test-api-key",
    getAccessToken: () => "test-jwt",
    fetchImplementation: async () => jsonResponse({
      error: {
        code: "FORBIDDEN",
        message: "Role is not permitted",
        details: [],
        requestId: "request-123"
      }
    }, { status: 403 })
  });

  await assert.rejects(client.request("api/notifications"), (error) => {
    assert.equal(error.code, "FORBIDDEN");
    assert.equal(error.status, 403);
    assert.equal(error.message, "Role is not permitted");
    assert.equal(error.requestId, "request-123");
    return true;
  });
});

test("normalizes transport failures without exposing fetch internals", async () => {
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    apiKey: "test-api-key",
    getAccessToken: () => "test-jwt",
    fetchImplementation: async () => { throw new Error("socket details"); }
  });

  await assert.rejects(
    client.request("api/vehicles"),
    (error) => error.code === "NETWORK_ERROR" && error.message === "The Fleet API could not be reached"
  );
});
