import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import http from "node:http";
import request from "supertest";
import { createGatewayApplication } from "../src/app.js";
import { loadOpenApiDocument } from "../src/openapi.js";

const API_KEY = "gateway-test-key";
let openApiDocument;
let upstreamServer;
let upstreamUrl;

function gatewayConfig(overrides = {}) {
  const serviceUrl = overrides.serviceUrl ?? upstreamUrl;
  return {
    apiKeys: [API_KEY],
    corsOrigins: ["http://localhost:3000"],
    rateLimit: { windowMs: 60_000, maxRequests: 100 },
    proxyTimeoutMs: 500,
    services: {
      users: serviceUrl,
      vehicles: serviceUrl,
      telemetry: serviceUrl,
      geolocation: serviceUrl,
      notifications: serviceUrl
    },
    ...overrides,
    services: overrides.services ?? {
      users: serviceUrl,
      vehicles: serviceUrl,
      telemetry: serviceUrl,
      geolocation: serviceUrl,
      notifications: serviceUrl
    }
  };
}

function createApp(configOverrides = {}, applicationOverrides = {}) {
  return createGatewayApplication({
    gatewayConfig: gatewayConfig(configOverrides),
    openApiDocument,
    ...applicationOverrides
  });
}

before(async () => {
  openApiDocument = await loadOpenApiDocument();
  upstreamServer = http.createServer((incoming, response) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", () => {
      const bodyText = Buffer.concat(chunks).toString("utf8");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          method: incoming.method,
          url: incoming.url,
          authorization: incoming.headers.authorization ?? null,
          requestId: incoming.headers["x-request-id"] ?? null,
          body: bodyText ? JSON.parse(bodyText) : null
        })
      );
    });
  });
  await new Promise((resolve) => upstreamServer.listen(0, "127.0.0.1", resolve));
  const address = upstreamServer.address();
  upstreamUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!upstreamServer) return;
  await new Promise((resolve, reject) =>
    upstreamServer.close((error) => (error ? reject(error) : resolve()))
  );
});

test("serves health and OpenAPI documentation without an API key", async () => {
  const app = createApp();

  const health = await request(app).get("/health").expect(200);
  assert.equal(health.body.data.service, "gateway");

  const specification = await request(app).get("/api-docs/openapi.json").expect(200);
  assert.equal(specification.body.openapi, "3.0.3");
  assert.ok(specification.body.paths["/api/vehicles"]);

  await request(app).get("/api-docs/").expect(200).expect("content-type", /html/);
});

test("rejects missing and invalid API keys", async () => {
  const app = createApp();

  const missing = await request(app).get("/api/users/me").expect(401);
  assert.equal(missing.body.error.code, "UNAUTHORIZED");
  assert.equal(missing.body.error.message, "X-API-Key is required");

  const invalid = await request(app)
    .get("/api/users/me")
    .set("X-API-Key", "not-accepted")
    .expect(403);
  assert.equal(invalid.body.error.code, "FORBIDDEN");
});

test("routes requests to a service and preserves path, query, headers, and body", async () => {
  const app = createApp();
  const response = await request(app)
    .post("/api/telemetry?source=vehicle")
    .set("X-API-Key", API_KEY)
    .set("Authorization", "Bearer test-token")
    .set("X-Request-Id", "gateway-request-123")
    .send({ vehicleId: "vehicle-1", speedKph: 72 })
    .expect(200);

  assert.equal(response.body.method, "POST");
  assert.equal(response.body.url, "/api/telemetry?source=vehicle");
  assert.equal(response.body.authorization, "Bearer test-token");
  assert.equal(response.body.requestId, "gateway-request-123");
  assert.deepEqual(response.body.body, { vehicleId: "vehicle-1", speedKph: 72 });
});

test("applies rate limiting per validated API key", async () => {
  const app = createApp({ rateLimit: { windowMs: 60_000, maxRequests: 2 } });

  await request(app).get("/api/users").set("X-API-Key", API_KEY).expect(200);
  await request(app).get("/api/users").set("X-API-Key", API_KEY).expect(200);
  const limited = await request(app).get("/api/users").set("X-API-Key", API_KEY).expect(429);

  assert.equal(limited.body.error.code, "RATE_LIMIT_EXCEEDED");
  assert.match(limited.headers.ratelimit, /r=0/);
  assert.ok(limited.headers["retry-after"]);
});

test("returns a service-unavailable error when a target cannot be reached", async () => {
  const unavailableUrl = "http://127.0.0.1:1";
  const app = createApp({ serviceUrl: unavailableUrl, proxyTimeoutMs: 100 });

  const response = await request(app)
    .get("/api/vehicles")
    .set("X-API-Key", API_KEY)
    .expect(503);

  assert.equal(response.body.error.code, "SERVICE_UNAVAILABLE");
  assert.ok(response.body.error.requestId);
});

test("returns route-not-found for unsupported API routes", async () => {
  const app = createApp();
  const response = await request(app)
    .get("/api/unsupported")
    .set("X-API-Key", API_KEY)
    .expect(404);

  assert.equal(response.body.error.code, "ROUTE_NOT_FOUND");
});

test("reports downstream readiness without exposing it to API-key checks", async () => {
  const requestedUrls = [];
  const fetchImplementation = async (url) => {
    requestedUrls.push(url.toString());
    return { ok: !url.toString().includes("telemetry") };
  };
  const config = gatewayConfig({
    services: {
      users: "http://users.test",
      vehicles: "http://vehicles.test",
      telemetry: "http://telemetry.test",
      geolocation: "http://geolocation.test",
      notifications: "http://notifications.test"
    }
  });
  const app = createGatewayApplication({
    gatewayConfig: config,
    openApiDocument,
    fetchImplementation
  });

  const response = await request(app).get("/ready").expect(503);
  assert.equal(response.body.data.status, "degraded");
  assert.equal(response.body.data.services.telemetry.status, "unavailable");
  assert.equal(response.body.data.services.users.status, "available");
  assert.equal(requestedUrls.length, 5);
});
