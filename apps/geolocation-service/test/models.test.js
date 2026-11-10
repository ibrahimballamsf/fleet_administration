import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createGeocodeCacheModel, createVehicleLocationModel } from "../src/models/index.js";

const connection = mongoose.createConnection();
const VehicleLocation = createVehicleLocationModel(connection);
const GeocodeCache = createGeocodeCacheModel(connection);

test.after(async () => connection.close());

test("accepts a valid authoritative vehicle location", async () => {
  const location = new VehicleLocation({
    vehicleId: "vehicle-1",
    location: { type: "Point", coordinates: [4.3517, 50.8503] },
    source: "telemetry",
    recordedAt: new Date()
  });
  await location.validate();
});

test("defines the required geospatial and cache expiry indexes", () => {
  const locationIndexes = VehicleLocation.schema.indexes();
  assert.ok(locationIndexes.some(([fields]) => fields.location === "2dsphere"));

  const cacheIndexes = GeocodeCache.schema.indexes();
  assert.ok(
    cacheIndexes.some(([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0)
  );
});

test("rejects invalid cached geocoding coordinates", async () => {
  const entry = new GeocodeCache({
    queryHash: "hash",
    normalizedQuery: "Brussels",
    displayName: "Brussels, Belgium",
    location: { type: "Point", coordinates: [181, 91] },
    provider: "mock",
    expiresAt: new Date(Date.now() + 60_000)
  });

  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors["location.coordinates"]);
    return true;
  });
});
