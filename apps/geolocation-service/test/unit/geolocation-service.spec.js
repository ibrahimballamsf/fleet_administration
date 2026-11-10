import { expect } from "chai";
import { createGeolocationService } from "../../src/services/geolocation-service.js";

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error("Expected promise to reject");
}

function location(overrides = {}) {
  return { _id: "location-1", vehicleId: "vehicle-1", location: { type: "Point", coordinates: [4.35, 50.85] }, source: "gps", recordedAt: new Date("2026-11-08"), ...overrides };
}

function makeService(overrides = {}) {
  const calls = { geocode: [], cached: [], locations: [], nearby: [] };
  const repository = {
    findCachedGeocode: async () => null,
    cacheGeocode: async (input) => calls.cached.push(input),
    upsertVehicleLocation: async (input) => { calls.locations.push(input); return { location: location({ location: input.location, source: input.source, recordedAt: input.recordedAt }), updated: true }; },
    findVehicleLocation: async () => location(),
    nearby: async (input) => { calls.nearby.push(input); return []; },
    listLocations: async () => [],
    ...overrides.repository
  };
  const geocoder = {
    geocode: async (address) => { calls.geocode.push(address); return { latitude: 50.85, longitude: 4.35, displayName: "Brussels, Belgium", provider: "nominatim", providerPlaceId: "123" }; },
    ...overrides.geocoder
  };
  return { service: createGeolocationService({ repository, geocoder, cacheTtlSeconds: 3600, maxNearbyRadiusKm: 100 }), calls };
}

describe("Geolocation Service unit tests", () => {
  it("returns cached geocoding results without calling the external provider", async () => {
    const { service, calls } = makeService({ repository: { findCachedGeocode: async () => ({ location: { coordinates: [4.36, 50.84] }, displayName: "Cached Brussels", provider: "nominatim", providerPlaceId: "cached-1" }) } });
    const result = await service.geocode({ address: "Brussels" });

    expect(result).to.include({ latitude: 50.84, longitude: 4.36, cached: true, attribution: "© OpenStreetMap contributors" });
    expect(calls.geocode).to.have.length(0);
    expect(calls.cached).to.have.length(0);
  });

  it("caches provider results and optionally stores them as a vehicle location", async () => {
    const { service, calls } = makeService();
    const result = await service.geocode({ address: "Rue de la Loi, Brussels", vehicleId: "vehicle-1" });

    expect(result.cached).to.equal(false);
    expect(calls.geocode).to.deep.equal(["Rue de la Loi, Brussels"]);
    expect(calls.cached[0].location.coordinates).to.deep.equal([4.35, 50.85]);
    expect(calls.cached[0].expiresAt.getTime() - calls.cached[0].cachedAt.getTime()).to.equal(3_600_000);
    expect(calls.locations[0]).to.include({ vehicleId: "vehicle-1", source: "geocoded", address: "Brussels, Belgium" });
  });

  it("rejects nearby searches beyond the configured maximum radius", async () => {
    const { service, calls } = makeService();
    const error = await rejected(service.nearby({ latitude: 50, longitude: 4, radiusKm: 101, limit: 10 }));

    expect(error.code).to.equal("VALIDATION_ERROR");
    expect(calls.nearby).to.have.length(0);
  });

  it("uses a vehicle's stored coordinates and excludes it from nearby results", async () => {
    const { service, calls } = makeService({ repository: { nearby: async (input) => { calls.nearby.push(input); return [location({ vehicleId: "vehicle-2", distanceMeters: 1234 })]; } } });
    const results = await service.nearbyVehicle("vehicle-1", { radiusKm: 10, limit: 5 });

    expect(calls.nearby[0]).to.deep.equal({ latitude: 50.85, longitude: 4.35, radiusKm: 10, limit: 5, excludeVehicleId: "vehicle-1" });
    expect(results[0]).to.include({ vehicleId: "vehicle-2", distanceKm: 1.234 });
  });
});
