import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createTelemetryModel, createVehicleEventModel } from "../src/models/index.js";

const connection = mongoose.createConnection();
const Telemetry = createTelemetryModel(connection);
const VehicleEvent = createVehicleEventModel(connection);

test.after(async () => connection.close());

test("accepts valid telemetry and applies event defaults", async () => {
  const telemetry = new Telemetry({
    vehicleId: "vehicle-1",
    location: { type: "Point", coordinates: [4.3517, 50.8503] },
    speedKph: 45,
    batteryPercent: 80,
    recordedAt: new Date()
  });

  await telemetry.validate();
  assert.equal(telemetry.eventType, "none");
  assert.equal(telemetry.severity, "information");
});

test("rejects impossible telemetry values and unsupported events", async () => {
  const telemetry = new Telemetry({
    vehicleId: "vehicle-1",
    location: { type: "Point", coordinates: [4.3517, 50.8503] },
    speedKph: -1,
    batteryPercent: 101,
    recordedAt: new Date()
  });
  await assert.rejects(telemetry.validate(), (error) => {
    assert.ok(error.errors.speedKph);
    assert.ok(error.errors.batteryPercent);
    return true;
  });

  const event = new VehicleEvent({
    vehicleId: "vehicle-1",
    type: "unknown_event",
    severity: "critical",
    occurredAt: new Date()
  });
  await assert.rejects(event.validate(), (error) => {
    assert.ok(error.errors.type);
    return true;
  });
});
