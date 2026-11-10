import { createMockGeocoder } from "./mock-geocoder.js";
import { createNominatimGeocoder } from "./nominatim-geocoder.js";

export function createGeocoder(config) {
  if (config.provider === "mock") return createMockGeocoder();
  return createNominatimGeocoder(config);
}

export { createMockGeocoder, createNominatimGeocoder };
