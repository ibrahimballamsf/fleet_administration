import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { createNotificationApplication } from "../src/app.js";
import { createStubSmsProvider, createTwilioSmsProvider } from "../src/providers/index.js";
import { SmsProviderError } from "../src/providers/sms-provider-error.js";
import { createTokenVerifier } from "../src/security/token-verifier.js";
import { createNotificationService } from "../src/services/notification-service.js";

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
  const notifications = new Map();
  const attempts = [];
  return {
    notifications,
    attempts,
    async create(values) {
      const now = new Date();
      const notification = {
        id: new mongoose.Types.ObjectId().toString(),
        ...structuredClone(values),
        createdAt: now,
        updatedAt: now
      };
      notifications.set(notification.id, notification);
      return structuredClone(notification);
    },
    async findById(id) {
      const notification = notifications.get(id);
      return notification ? structuredClone(notification) : null;
    },
    async updateById(id, changes) {
      const current = notifications.get(id);
      const updated = { ...current, ...structuredClone(changes), updatedAt: new Date() };
      notifications.set(id, updated);
      return structuredClone(updated);
    },
    async list({ filters, page, pageSize }) {
      const matching = [...notifications.values()].filter((notification) =>
        Object.entries(filters).every(([key, value]) => value === undefined || notification[key] === value)
      );
      return {
        notifications: matching
          .slice((page - 1) * pageSize, page * pageSize)
          .map((notification) => structuredClone(notification)),
        totalItems: matching.length
      };
    },
    async createAttempt(values) {
      const attempt = { id: new mongoose.Types.ObjectId().toString(), ...structuredClone(values) };
      attempts.push(attempt);
      return structuredClone(attempt);
    },
    async listAttempts(notificationId) {
      return attempts
        .filter((attempt) => attempt.notificationId === notificationId)
        .map((attempt) => structuredClone(attempt));
    }
  };
}

function createFixture({ provider = createStubSmsProvider(), adminPhoneNumbers } = {}) {
  const repository = createMemoryRepository();
  const notificationService = createNotificationService({
    repository,
    smsProvider: provider,
    adminPhoneNumbers: adminPhoneNumbers ?? ["+32470000000", "+32470000001"]
  });
  const app = createNotificationApplication({
    notificationService,
    tokenVerifier: createTokenVerifier(jwtConfig)
  });
  return { app, repository };
}

test("sends status-change SMS messages to all configured administrators", async () => {
  const { app, repository } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const response = await request(app)
    .post("/api/notifications/send")
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .send({
      event: {
        type: "status_change",
        vehicleId,
        registrationNumber: "BE-123-XY",
        previousStatus: "operational",
        newStatus: "maintenance",
        reason: "Scheduled service"
      }
    })
    .expect(201);

  assert.equal(response.body.data.status, "sent");
  assert.equal(response.body.data.summary.total, 2);
  assert.equal(response.body.data.summary.sent, 2);
  assert.equal(repository.notifications.size, 2);
  assert.equal(repository.attempts.length, 2);
  assert.match(response.body.data.notifications[0].message, /BE-123-XY/);
});

test("records failed delivery and allows an administrator to retry it", async () => {
  let shouldFail = true;
  const provider = {
    name: "stub",
    async send() {
      if (shouldFail) throw new SmsProviderError("TEST_FAILURE", "Planned test failure");
      return { providerMessageId: "stub-retry-success", providerStatus: "sent" };
    }
  };
  const { app, repository } = createFixture({ provider, adminPhoneNumbers: ["+32470000000"] });
  const adminToken = accessToken("admin");
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const failed = await request(app)
    .post("/api/notifications/send")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      recipientUserId: "admin-1",
      recipientPhoneNumber: "+32470000000",
      vehicleId,
      triggerType: "engine_fault",
      message: "Engine fault detected"
    })
    .expect(201);
  assert.equal(failed.body.data.status, "failed");
  assert.match(failed.body.data.notifications[0].failureReason, /TEST_FAILURE/);

  shouldFail = false;
  const retried = await request(app)
    .post(`/api/notifications/${failed.body.data.id}/retry`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(retried.body.data.status, "sent");
  assert.equal(retried.body.data.attemptCount, 2);
  assert.equal(repository.attempts.length, 2);
});

test("lists notification records and returns their attempts", async () => {
  const { app } = createFixture({ adminPhoneNumbers: ["+32470000000"] });
  const token = accessToken("dispatcher");
  const vehicleId = new mongoose.Types.ObjectId().toString();
  const sent = await request(app)
    .post("/api/notifications/send")
    .set("Authorization", `Bearer ${token}`)
    .send({ event: { type: "low_battery", vehicleId } })
    .expect(201);

  const list = await request(app)
    .get(`/api/notifications?status=sent&vehicleId=${vehicleId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.meta.pagination.totalItems, 1);

  const detail = await request(app)
    .get(`/api/notifications/${sent.body.data.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(detail.body.data.attempts.length, 1);
  assert.equal(detail.body.data.attempts[0].status, "sent");
});

test("enforces authentication and administrator-only retries", async () => {
  const { app } = createFixture({ provider: createStubSmsProvider({ mode: "failure" }), adminPhoneNumbers: ["+32470000000"] });
  const vehicleId = new mongoose.Types.ObjectId().toString();
  await request(app).get("/api/notifications").expect(401);
  await request(app)
    .get("/api/notifications")
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .expect(403);

  const failed = await request(app)
    .post("/api/notifications/send")
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .send({ event: { type: "emergency_stop", vehicleId } })
    .expect(201);
  await request(app)
    .post(`/api/notifications/${failed.body.data.id}/retry`)
    .set("Authorization", `Bearer ${accessToken("dispatcher")}`)
    .expect(403);
});

test("Twilio provider sends form-encoded Message resource requests", async () => {
  let captured;
  const provider = createTwilioSmsProvider({
    accountSid: "AC00000000000000000000000000000000",
    authToken: "test-token",
    fromNumber: "+15550000000",
    timeoutMs: 1000,
    async fetchImplementation(url, options) {
      captured = { url, options };
      return {
        ok: true,
        async json() {
          return { sid: "SM00000000000000000000000000000000", status: "queued" };
        }
      };
    }
  });

  const result = await provider.send({ to: "+15550000001", message: "Test alert" });
  assert.match(captured.url, /\/2010-04-01\/Accounts\/AC.*\/Messages\.json$/);
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers["content-type"], "application/x-www-form-urlencoded");
  assert.equal(captured.options.body.get("To"), "+15550000001");
  assert.equal(captured.options.body.get("From"), "+15550000000");
  assert.equal(captured.options.body.get("Body"), "Test alert");
  assert.equal(result.providerStatus, "queued");
});
