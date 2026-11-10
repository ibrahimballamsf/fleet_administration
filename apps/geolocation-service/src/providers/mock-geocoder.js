import { NotFoundError } from "@fleet/shared/http";

const DEFAULT_LOCATIONS = Object.freeze({
  "brussels, belgium": { latitude: 50.8503, longitude: 4.3517, displayName: "Brussels, Belgium" },
  "antwerp, belgium": { latitude: 51.2194, longitude: 4.4025, displayName: "Antwerp, Belgium" },
  "ghent, belgium": { latitude: 51.0543, longitude: 3.7174, displayName: "Ghent, Belgium" }
});

export function normalizeAddress(address) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

export function createMockGeocoder(locations = DEFAULT_LOCATIONS) {
  const normalizedLocations = new Map(
    Object.entries(locations).map(([address, value]) => [normalizeAddress(address), value])
  );

  return Object.freeze({
    async geocode(address) {
      const result = normalizedLocations.get(normalizeAddress(address));
      if (!result) throw new NotFoundError("The address could not be geocoded by the mock provider");
      return {
        ...result,
        provider: "mock",
        providerPlaceId: `mock:${normalizeAddress(address)}`,
        attribution: "Mock geocoding data"
      };
    }
  });
}
