import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { createTelemetryApplication } from "../src/app.js";
import { createTokenVerifier } from "../src/security/token-verifier.js";
import { createTelemetryService } from "../src/services/telemetry-service.js";

const jwtConfig = {
  secret: "test-secret-that-is-at-least-thirty-two-characters",
  issuer: "fleet-user-service-test",
  audience: "fleet-api-test"
};

function accessToken(role) {
  return jwt.sign({ role }, jwtConfig.secret, {
    algorithm: "HS256",
    subject: new mongoose.Types.ObjectId().toString(),
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    expiresIn: "1h"
  });
}

function createMemoryRepository() {
  const telemetry = [];
  const events = [];
  return {
    telemetry,
    events,
    async createTelemetry(values) {
      const document = {
        id: new mongoose.Types.ObjectId().toString(),
        ...structuredClone(values),
        receivedAt: new Date()
      };
      telemetry.push(document);
      return structuredClone(document);
    },
    async listTelemetry(vehicleId, { page, pageSize }) {
      const matching = telemetry.filter((item) => item.vehicleId === vehicleId);
      return {
        telemetry: matching
          .slice((page - 1) * pageSize, page * pageSize)
          .map((item) => structuredClone(item)),
        totalItems: matching.length
      };
    },
    async latestTelemetry(vehicleId) {
      return telemetry
        .filter((item) => item.vehicleId === vehicleId)
        .sort((left, right) => right.recordedAt - left.recordedAt)
        .map((item) => structuredClone(item))[0] ?? null;
    },
    async createEvent(values) {
      const event = { id: new mongoose.Types.ObjectId().toString(), ...structuredClone(values) };
      events.push(event);
      return structuredClone(event);
    },
    async updateEvent(id, changes) {
      const index = events.findIndex((event) => event.id === id);
      events[index] = { ...events[index], ...structuredClone(changes) };
      return structuredClone(events[index]);
    },
    async listEvents(vehicleId) {
      return events
        .filter((event) => event.vehicleId === vehicleId)
        .map((event) => structuredClone(event));
    }
  };
}

function createFixture({ notificationFailure = false, integrationFailure = false } = {}) {
  const repository = createMemoryRepository();
  const calls = { vehicleGet: [], summaries: [], locations: [], notifications: [] };
  const vehicleClient = {
    async getVehicle(vehicleId) {
      calls.vehicleGet.push(vehicleId);
      return { data: { id: vehicleId, registrationNumber: "BE-123-XY" } };
    },
    async updateTelemetrySummary(vehicleId, summary) {
      calls.summaries.push({ vehicleId, summary });
      if (integrationFailure) throw new Error("vehicle service unavailable");
      return { data: { updated: true } };
    }
  };
  const geolocationClient = {
    async updateLocation(vehicleId, location) {
      calls.locations.push({ vehicleId, location });
      if (integrationFailure) throw new Error("geolocation unavailable");
      return { data: { updated: true } };
    }
  };
  const notificationClient = {
    async sendCriticalEvent(event) {
      calls.notifications.push(event);
      if (notificationFailure) throw new Error("notification unavailable");
      return { data: { id: "notification-1", status: "sent" } };
    }
  };
  const telemetryService = createTelemetryService({
    repository,
    vehicleClient,
    geolocationClient,
    notificationClient
  });
  const app = createTelemetryApplication({
    telemetryService,
    tokenVerifier: createTokenVerifier(jwtConfig)
  });
  return { app, repository, calls };
}

function telemetryPayload(vehicleId, overrides = {}) {
  return {
    vehicleId,
    latitude: 50.8503,
    longitude: 4.3517,
    speedKph: 45,
    batteryPercent: 80,
    engineCondition: "normal",
    recordedAt: "2026-11-07T10:00:00.000Z",
    ...overrides
  };
}

test("stores telemetry and synchronizes vehicle and geolocation summaries", async () => {
  const { app, calls } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const dispatcher = accessToken("dispatcher");

  const created = await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${dispatcher}`)
    .send(telemetryPayload(vehicleId))
    .expect(201);
  assert.equal(created.body.data.telemetry.vehicleId, vehicleId);
  assert.equal(created.body.data.integrations.geolocation.status, "synchronized");
  assert.equal(created.body.data.integrations.vehicleSummary.status, "synchronized");
  assert.equal(created.body.data.integrations.notification.status, "not_required");
  assert.equal(calls.locations.length, 1);
  assert.equal(calls.summaries.length, 1);

  const latest = await request(app)
    .get(`/api/telemetry/vehicle/${vehicleId}/latest`)
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .expect(200);
  assert.equal(latest.body.data.speedKph, 45);

  const history = await request(app)
    .get(`/api/telemetry/vehicle/${vehicleId}?page=1&pageSize=10`)
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .expect(200);
  assert.equal(history.body.meta.pagination.totalItems, 1);
});

test("classifies engine faults and sends critical notifications", async () => {
  const { app, calls } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const result = await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .send(telemetryPayload(vehicleId, { engineCondition: "fault" }))
    .expect(201);

  assert.equal(result.body.data.telemetry.eventType, "engine_fault");
  assert.equal(result.body.data.event.severity, "critical");
  assert.equal(result.body.data.event.processingStatus, "notification_sent");
  assert.equal(result.body.data.integrations.notification.status, "sent");
  assert.equal(calls.notifications.length, 1);
});

test("automatically classifies low battery telemetry", async () => {
  const { app } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const result = await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${accessToken("admin")}`)
    .send(telemetryPayload(vehicleId, { batteryPercent: 10 }))
    .expect(201);
  assert.equal(result.body.data.telemetry.eventType, "low_battery");
  assert.equal(result.body.data.event.severity, "critical");
});

test("retains telemetry and event records when integrations fail", async () => {
  const { app, repository } = createFixture({ notificationFailure: true, integrationFailure: true });
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const result = await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .send(telemetryPayload(vehicleId, { eventType: "emergency_stop" }))
    .expect(201);

  assert.equal(repository.telemetry.length, 1);
  assert.equal(repository.events.length, 1);
  assert.equal(result.body.data.integrations.geolocation.status, "failed");
  assert.equal(result.body.data.integrations.vehicleSummary.status, "failed");
  assert.equal(result.body.data.integrations.notification.status, "failed");
  assert.equal(result.body.data.event.processingStatus, "notification_failed");
});

test("accepts explicit events and lists their notification outcome", async () => {
  const { app } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const token = accessToken("dispatcher");
  const created = await request(app)
    .post(`/api/telemetry/vehicle/${vehicleId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({ type: "emergency_stop", message: "Driver pressed emergency stop" })
    .expect(201);
  assert.equal(created.body.data.event.type, "emergency_stop");
  assert.equal(created.body.data.notification.status, "sent");

  const events = await request(app)
    .get(`/api/telemetry/vehicle/${vehicleId}/events`)
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .expect(200);
  assert.equal(events.body.data.length, 1);
});

test("enforces authentication, roles, and telemetry validation", async () => {
  const { app } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  await request(app).post("/api/telemetry").send(telemetryPayload(vehicleId)).expect(401);
  await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .send(telemetryPayload(vehicleId))
    .expect(403);
  await request(app)
    .post("/api/telemetry")
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .send(telemetryPayload(vehicleId, { batteryPercent: 101 }))
    .expect(400);
});
