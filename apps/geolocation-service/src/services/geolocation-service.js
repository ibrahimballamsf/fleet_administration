import { createHash } from "node:crypto";
import { NotFoundError, ValidationError } from "@fleet/shared/http";
import { normalizeAddress } from "../providers/mock-geocoder.js";

function serializeLocation(document) {
  const value = document?.toObject ? document.toObject() : { ...document };
  const [longitude, latitude] = value.location.coordinates;
  return {
    id: value.id ?? (value._id ? String(value._id) : undefined),
    vehicleId: value.vehicleId,
    latitude,
    longitude,
    source: value.source,
    accuracyMeters: value.accuracyMeters,
    recordedAt: value.recordedAt,
    address: value.address,
    ...(Number.isFinite(value.distanceMeters)
      ? { distanceKm: Math.round((value.distanceMeters / 1000) * 1000) / 1000 }
      : {})
  };
}

function cachedResult(entry) {
  const value = entry?.toObject ? entry.toObject() : entry;
  return {
    latitude: value.location.coordinates[1],
    longitude: value.location.coordinates[0],
    displayName: value.displayName,
    provider: value.provider,
    providerPlaceId: value.providerPlaceId,
    attribution: value.provider === "nominatim" ? "© OpenStreetMap contributors" : "Mock geocoding data",
    cached: true
  };
}

export function createGeolocationService({ repository, geocoder, cacheTtlSeconds, maxNearbyRadiusKm }) {
  function validateRadius(radiusKm) {
    if (radiusKm > maxNearbyRadiusKm) {
      throw new ValidationError(`radiusKm cannot exceed ${maxNearbyRadiusKm}`, {
        details: [{ code: "too_big", path: "radiusKm", message: `Maximum radius is ${maxNearbyRadiusKm} km` }]
      });
    }
  }

  async function saveLocation({ vehicleId, latitude, longitude, source, accuracyMeters, recordedAt, address }) {
    const result = await repository.upsertVehicleLocation({
      vehicleId,
      location: { type: "Point", coordinates: [longitude, latitude] },
      source,
      accuracyMeters,
      recordedAt,
      address
    });
    return { location: serializeLocation(result.location), updated: result.updated };
  }

  return Object.freeze({
    async geocode({ address, vehicleId }) {
      const normalizedQuery = normalizeAddress(address);
      const queryHash = createHash("sha256").update(normalizedQuery).digest("hex");
      const cached = await repository.findCachedGeocode(queryHash);
      const result = cached
        ? cachedResult(cached)
        : { ...(await geocoder.geocode(address)), cached: false };

      if (!cached) {
        const now = new Date();
        await repository.cacheGeocode({
          queryHash,
          normalizedQuery,
          displayName: result.displayName,
          location: { type: "Point", coordinates: [result.longitude, result.latitude] },
          provider: result.provider,
          providerPlaceId: result.providerPlaceId,
          cachedAt: now,
          expiresAt: new Date(now.getTime() + cacheTtlSeconds * 1000)
        });
      }

      let vehicleLocation;
      if (vehicleId) {
        vehicleLocation = await saveLocation({
          vehicleId,
          latitude: result.latitude,
          longitude: result.longitude,
          source: "geocoded",
          recordedAt: new Date(),
          address: result.displayName
        });
      }

      return { ...result, ...(vehicleLocation ? { vehicleLocation } : {}) };
    },

    updateLocation(vehicleId, input) {
      return saveLocation({ vehicleId, ...input });
    },

    async getVehicleLocation(vehicleId) {
      const location = await repository.findVehicleLocation(vehicleId);
      if (!location) throw new NotFoundError("Vehicle location not found");
      return serializeLocation(location);
    },

    async nearby(input) {
      validateRadius(input.radiusKm);
      return (await repository.nearby(input)).map(serializeLocation);
    },

    async nearbyVehicle(vehicleId, { radiusKm, limit }) {
      validateRadius(radiusKm);
      const origin = await repository.findVehicleLocation(vehicleId);
      if (!origin) throw new NotFoundError("Vehicle location not found");
      const [longitude, latitude] = origin.location.coordinates;
      return (await repository.nearby({
        latitude,
        longitude,
        radiusKm,
        limit,
        excludeVehicleId: vehicleId
      })).map(serializeLocation);
    },

    async listLocations(limit) {
      return (await repository.listLocations(limit)).map(serializeLocation);
    }
  });
}
