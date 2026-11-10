import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { createGeolocationApplication } from "../src/app.js";
import { createMockGeocoder, createNominatimGeocoder } from "../src/providers/index.js";
import { createTokenVerifier } from "../src/security/token-verifier.js";
import { createGeolocationService } from "../src/services/geolocation-service.js";

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

function distanceKm(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function createMemoryRepository() {
  const cache = new Map();
  const locations = new Map();
  return {
    cache,
    locations,
    async findCachedGeocode(queryHash, now = new Date()) {
      const entry = cache.get(queryHash);
      return entry && entry.expiresAt > now ? { ...entry } : null;
    },
    async cacheGeocode(values) {
      cache.set(values.queryHash, { ...values });
      return { ...values };
    },
    async findVehicleLocation(vehicleId) {
      const location = locations.get(vehicleId);
      return location ? structuredClone(location) : null;
    },
    async upsertVehicleLocation(values) {
      const existing = locations.get(values.vehicleId);
      if (existing && existing.recordedAt > values.recordedAt) {
        return { location: structuredClone(existing), updated: false };
      }
      const location = { id: new mongoose.Types.ObjectId().toString(), ...structuredClone(values) };
      locations.set(values.vehicleId, location);
      return { location: structuredClone(location), updated: true };
    },
    async nearby({ latitude, longitude, radiusKm, limit, excludeVehicleId }) {
      return [...locations.values()]
        .filter((location) => location.vehicleId !== excludeVehicleId)
        .map((location) => {
          const [vehicleLongitude, vehicleLatitude] = location.location.coordinates;
          return {
            ...structuredClone(location),
            distanceMeters:
              distanceKm(
                { latitude, longitude },
                { latitude: vehicleLatitude, longitude: vehicleLongitude }
              ) * 1000
          };
        })
        .filter((location) => location.distanceMeters <= radiusKm * 1000)
        .sort((left, right) => left.distanceMeters - right.distanceMeters)
        .slice(0, limit);
    },
    async listLocations(limit) {
      return [...locations.values()].slice(0, limit).map((location) => structuredClone(location));
    }
  };
}

function createFixture() {
  const repository = createMemoryRepository();
  const providerCalls = [];
  const baseGeocoder = createMockGeocoder({
    "Rue de la Loi 16, Brussels": {
      latitude: 50.8467,
      longitude: 4.3633,
      displayName: "16 Rue de la Loi, Brussels, Belgium"
    }
  });
  const geocoder = {
    async geocode(address) {
      providerCalls.push(address);
      return baseGeocoder.geocode(address);
    }
  };
  const geolocationService = createGeolocationService({
    repository,
    geocoder,
    cacheTtlSeconds: 3600,
    maxNearbyRadiusKm: 100
  });
  const app = createGeolocationApplication({
    geolocationService,
    tokenVerifier: createTokenVerifier(jwtConfig)
  });
  return { app, repository, providerCalls };
}

test("geocodes an address, caches it, and optionally stores the vehicle location", async () => {
  const { app, providerCalls } = createFixture();
  const token = accessToken("dispatcher");
  const vehicleId = new mongoose.Types.ObjectId().toString();

  const first = await request(app)
    .post("/api/maps/geocode")
    .set("Authorization", `Bearer ${token}`)
    .send({ address: "Rue de la Loi 16, Brussels", vehicleId })
    .expect(200);
  assert.equal(first.body.data.cached, false);
  assert.equal(first.body.data.vehicleLocation.updated, true);

  const second = await request(app)
    .post("/api/maps/geocode")
    .set("Authorization", `Bearer ${token}`)
    .send({ address: "  RUE DE LA LOI 16,  BRUSSELS  " })
    .expect(200);
  assert.equal(second.body.data.cached, true);
  assert.equal(providerCalls.length, 1);
});

test("stores coordinates and rejects stale location updates", async () => {
  const { app } = createFixture();
  const token = accessToken("dispatcher");
  const vehicleId = new mongoose.Types.ObjectId().toString();

  await request(app)
    .put(`/api/maps/vehicles/${vehicleId}/location`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      latitude: 50.8503,
      longitude: 4.3517,
      source: "telemetry",
      recordedAt: "2026-11-07T10:00:00.000Z"
    })
    .expect(200);

  const stale = await request(app)
    .put(`/api/maps/vehicles/${vehicleId}/location`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      latitude: 51,
      longitude: 5,
      source: "telemetry",
      recordedAt: "2026-11-07T09:00:00.000Z"
    })
    .expect(200);
  assert.equal(stale.body.data.updated, false);
  assert.equal(stale.body.data.location.latitude, 50.8503);
});

test("returns nearby vehicles ordered by distance and excludes distant vehicles", async () => {
  const { app } = createFixture();
  const dispatcher = accessToken("dispatcher");
  const viewer = accessToken("viewer");
  const originId = new mongoose.Types.ObjectId().toString();
  const nearbyId = new mongoose.Types.ObjectId().toString();
  const distantId = new mongoose.Types.ObjectId().toString();

  for (const [vehicleId, latitude, longitude] of [
    [originId, 50.8503, 4.3517],
    [nearbyId, 50.86, 4.36],
    [distantId, 51.2194, 4.4025]
  ]) {
    await request(app)
      .put(`/api/maps/vehicles/${vehicleId}/location`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({ latitude, longitude, source: "manual" })
      .expect(200);
  }

  const nearby = await request(app)
    .get(`/api/maps/vehicles/${originId}/nearby?radiusKm=10&limit=10`)
    .set("Authorization", `Bearer ${viewer}`)
    .expect(200);
  assert.deepEqual(nearby.body.data.map((item) => item.vehicleId), [nearbyId]);
  assert.ok(nearby.body.data[0].distanceKm > 0);

  const coordinateSearch = await request(app)
    .get("/api/maps/vehicles/nearby?latitude=50.8503&longitude=4.3517&radiusKm=10")
    .set("Authorization", `Bearer ${viewer}`)
    .expect(200);
  assert.equal(coordinateSearch.body.data.length, 2);
});

test("enforces update roles, authentication, and maximum radius", async () => {
  const { app } = createFixture();
  const vehicleId = new mongoose.Types.ObjectId().toString();
  await request(app).get("/api/maps/vehicles").expect(401);
  await request(app)
    .put(`/api/maps/vehicles/${vehicleId}/location`)
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .send({ latitude: 50.85, longitude: 4.35, source: "manual" })
    .expect(403);

  const excessive = await request(app)
    .get("/api/maps/vehicles/nearby?latitude=50.85&longitude=4.35&radiusKm=101")
    .set("Authorization", `Bearer ${accessToken("viewer")}`)
    .expect(400);
  assert.equal(excessive.body.error.code, "VALIDATION_ERROR");
});

test("Nominatim adapter sends required search parameters and identifying User-Agent", async () => {
  let captured;
  const geocoder = createNominatimGeocoder({
    baseUrl: "https://nominatim.example",
    userAgent: "fleet-administration-test/1.0 contact@example.com",
    timeoutMs: 1000,
    minimumIntervalMs: 0,
    async fetchImplementation(url, options) {
      captured = { url, options };
      return {
        ok: true,
        async json() {
          return [{ lat: "50.8503", lon: "4.3517", display_name: "Brussels", place_id: 123 }];
        }
      };
    }
  });

  const result = await geocoder.geocode("Brussels, Belgium");
  assert.match(captured.url, /\/search\?/);
  assert.match(captured.url, /format=jsonv2/);
  assert.match(captured.url, /limit=1/);
  assert.equal(captured.options.headers["user-agent"], "fleet-administration-test/1.0 contact@example.com");
  assert.equal(result.provider, "nominatim");
});
