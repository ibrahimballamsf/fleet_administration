import { requestJson } from "./http.js";

export function createGeolocationClient({ baseUrl }) {
  return Object.freeze({
    updateLocation(vehicleId, location, context) {
      return requestJson(`${baseUrl}/api/maps/vehicles/${vehicleId}/location`, {
        method: "PUT",
        body: { ...location, source: "telemetry" },
        context
      });
    }
  });
}
