import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { createVehicleApplication } from "../src/app.js";
import { createTokenVerifier } from "../src/security/token-verifier.js";
import { createVehicleService } from "../src/services/vehicle-service.js";

const jwtConfig = {
  secret: "test-secret-that-is-at-least-thirty-two-characters",
  issuer: "fleet-user-service-test",
  audience: "fleet-api-test"
};

function accessToken(role, id = new mongoose.Types.ObjectId().toString()) {
  return jwt.sign({ role, email: `${role}@example.com` }, jwtConfig.secret, {
    algorithm: "HS256",
    subject: id,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    expiresIn: "1h"
  });
}

function createMemoryRepository() {
  const vehicles = new Map();
  const history = [];

  return {
    vehicles,
    history,
    async create(values) {
      if ([...vehicles.values()].some((vehicle) => vehicle.registrationNumber === values.registrationNumber)) {
        const error = new Error("duplicate registration");
        error.code = 11000;
        error.keyPattern = { registrationNumber: 1 };
        throw error;
      }
      const now = new Date();
      const vehicle = {
        id: new mongoose.Types.ObjectId().toString(),
        ...values,
        createdAt: now,
        updatedAt: now
      };
      vehicles.set(vehicle.id, vehicle);
      return { ...vehicle };
    },
    async findById(id) {
      const vehicle = vehicles.get(id);
      return vehicle ? { ...vehicle } : null;
    },
    async list({ filters, page, pageSize }) {
      const matching = [...vehicles.values()].filter((vehicle) => {
        if (filters.status && vehicle.operationalStatus !== filters.status) return false;
        if (filters.registrationNumber && vehicle.registrationNumber !== filters.registrationNumber) return false;
        if (filters.make && vehicle.make.toLowerCase() !== filters.make.toLowerCase()) return false;
        if (filters.model && vehicle.model.toLowerCase() !== filters.model.toLowerCase()) return false;
        return true;
      });
      return {
        vehicles: matching.slice((page - 1) * pageSize, page * pageSize).map((item) => ({ ...item })),
        totalItems: matching.length
      };
    },
    async updateById(id, changes) {
      const vehicle = vehicles.get(id);
      if (!vehicle) return null;
      const updated = { ...vehicle, ...changes, updatedAt: new Date() };
      vehicles.set(id, updated);
      return { ...updated };
    },
    async deleteById(id) {
      const vehicle = vehicles.get(id);
      if (!vehicle) return null;
      vehicles.delete(id);
      return { ...vehicle };
    },
    async createStatusHistory(values) {
      const entry = { id: new mongoose.Types.ObjectId().toString(), ...values, changedAt: new Date() };
      history.push(entry);
      return { ...entry };
    },
    async listStatusHistory(vehicleId) {
      return history.filter((entry) => String(entry.vehicleId) === String(vehicleId)).map((entry) => ({ ...entry }));
    }
  };
}

function createFixture({ notificationFailure = false } = {}) {
  const repository = createMemoryRepository();
  const notifications = [];
  const notificationClient = {
    async notifyStatusChange(event) {
      notifications.push(event);
      if (notificationFailure) throw new Error("provider unavailable");
      return { data: { notificationId: "notification-1" } };
    }
  };
  const vehicleService = createVehicleService({ repository, notificationClient });
  const tokenVerifier = createTokenVerifier(jwtConfig);
  const app = createVehicleApplication({ vehicleService, tokenVerifier });
  return { app, repository, notifications };
}

const validVehicle = {
  registrationNumber: "be-123-xy",
  vin: "1HGBH41JXMN109186",
  make: "Volvo",
  model: "FH",
  year: 2024,
  location: { latitude: 50.8503, longitude: 4.3517 }
};

test("registers, lists, and retrieves vehicles", async () => {
  const { app } = createFixture();
  const dispatcherToken = accessToken("dispatcher");
  const viewerToken = accessToken("viewer");

  const created = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${dispatcherToken}`)
    .send(validVehicle)
    .expect(201);

  assert.equal(created.body.data.registrationNumber, "BE-123-XY");
  assert.deepEqual(created.body.data.latestLocation.coordinates, [4.3517, 50.8503]);

  const list = await request(app)
    .get("/api/vehicles?page=1&pageSize=10&status=operational")
    .set("Authorization", `Bearer ${viewerToken}`)
    .expect(200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.meta.pagination.totalItems, 1);

  const retrieved = await request(app)
    .get(`/api/vehicles/${created.body.data.id}`)
    .set("Authorization", `Bearer ${viewerToken}`)
    .expect(200);
  assert.equal(retrieved.body.data.vin, validVehicle.vin);
});

test("records status history and triggers notification integration", async () => {
  const { app, notifications } = createFixture();
  const token = accessToken("dispatcher");
  const created = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${token}`)
    .send(validVehicle)
    .expect(201);

  const updated = await request(app)
    .patch(`/api/vehicles/${created.body.data.id}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "out_of_service", reason: "Scheduled repair" })
    .expect(200);

  assert.equal(updated.body.data.vehicle.operationalStatus, "out_of_service");
  assert.equal(updated.body.data.notification.status, "requested");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].previousStatus, "operational");

  const history = await request(app)
    .get(`/api/vehicles/${created.body.data.id}/status-history`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(history.body.data.length, 2);
});

test("retains a valid status change when notification integration fails", async () => {
  const { app } = createFixture({ notificationFailure: true });
  const token = accessToken("admin");
  const created = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${token}`)
    .send(validVehicle)
    .expect(201);

  const updated = await request(app)
    .patch(`/api/vehicles/${created.body.data.id}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "emergency" })
    .expect(200);
  assert.equal(updated.body.data.vehicle.operationalStatus, "emergency");
  assert.equal(updated.body.data.notification.status, "failed");
});

test("updates the vehicle telemetry summary and ignores stale readings", async () => {
  const { app } = createFixture();
  const token = accessToken("dispatcher");
  const created = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${token}`)
    .send(validVehicle)
    .expect(201);

  const current = await request(app)
    .patch(`/api/vehicles/${created.body.data.id}/telemetry-summary`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      latitude: 50.9,
      longitude: 4.4,
      recordedAt: "2026-11-07T10:00:00.000Z"
    })
    .expect(200);
  assert.equal(current.body.data.updated, true);

  const stale = await request(app)
    .patch(`/api/vehicles/${created.body.data.id}/telemetry-summary`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      latitude: 51,
      longitude: 5,
      recordedAt: "2026-11-07T09:00:00.000Z"
    })
    .expect(200);
  assert.equal(stale.body.data.updated, false);
  assert.deepEqual(stale.body.data.vehicle.latestLocation.coordinates, [4.4, 50.9]);
});

test("allows only administrators to delete vehicles", async () => {
  const { app } = createFixture();
  const adminToken = accessToken("admin");
  const viewerToken = accessToken("viewer");
  const created = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(validVehicle)
    .expect(201);

  await request(app)
    .delete(`/api/vehicles/${created.body.data.id}`)
    .set("Authorization", `Bearer ${viewerToken}`)
    .expect(403);
  await request(app)
    .delete(`/api/vehicles/${created.body.data.id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(204);
});

test("rejects duplicate registrations, invalid coordinates, and missing tokens", async () => {
  const { app } = createFixture();
  const token = accessToken("admin");
  await request(app).get("/api/vehicles").expect(401);
  await request(app).post("/api/vehicles").set("Authorization", `Bearer ${token}`).send(validVehicle).expect(201);

  const duplicate = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${token}`)
    .send(validVehicle)
    .expect(409);
  assert.equal(duplicate.body.error.code, "CONFLICT");

  await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...validVehicle, registrationNumber: "BE-999-ZZ", location: { latitude: 95, longitude: 4 } })
    .expect(400);
});
