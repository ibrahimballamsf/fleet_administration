import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createVehicleModel, createVehicleStatusHistoryModel } from "../src/models/index.js";

const connection = mongoose.createConnection();
const Vehicle = createVehicleModel(connection);
const VehicleStatusHistory = createVehicleStatusHistoryModel(connection);

test.after(async () => connection.close());

test("normalizes vehicle identifiers and validates GeoJSON coordinate order", async () => {
  const vehicle = new Vehicle({
    registrationNumber: "be-123-xy",
    vin: "1HGBH41JXMN109186",
    make: "Volvo",
    model: "FH",
    latestLocation: {
      type: "Point",
      coordinates: [4.3517, 50.8503],
      updatedAt: new Date()
    }
  });

  await vehicle.validate();
  assert.equal(vehicle.registrationNumber, "BE-123-XY");
  assert.equal(vehicle.operationalStatus, "operational");
});

test("rejects invalid coordinates and status transitions", async () => {
  const vehicle = new Vehicle({
    registrationNumber: "BE-999-ZZ",
    make: "Test",
    model: "Vehicle",
    latestLocation: { type: "Point", coordinates: [200, 95], updatedAt: new Date() }
  });
  await assert.rejects(vehicle.validate(), (error) => {
    assert.ok(error.errors["latestLocation.coordinates"]);
    return true;
  });

  const history = new VehicleStatusHistory({
    vehicleId: new mongoose.Types.ObjectId(),
    toStatus: "flying",
    changedByUserId: "user-1"
  });
  await assert.rejects(history.validate(), (error) => {
    assert.ok(error.errors.toStatus);
    return true;
  });
});

test("rejects vehicle years beyond the supported range", async () => {
  const vehicle = new Vehicle({
    registrationNumber: "BE-888-YY",
    make: "Test",
    model: "Future Vehicle",
    year: new Date().getUTCFullYear() + 2
  });

  await assert.rejects(vehicle.validate(), (error) => {
    assert.ok(error.errors.year);
    return true;
  });
});
