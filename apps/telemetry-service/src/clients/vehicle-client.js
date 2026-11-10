import { requestJson } from "./http.js";

export function createVehicleClient({ baseUrl }) {
  return Object.freeze({
    getVehicle(vehicleId, context) {
      return requestJson(`${baseUrl}/api/vehicles/${vehicleId}`, { context });
    },
    updateTelemetrySummary(vehicleId, summary, context) {
      return requestJson(`${baseUrl}/api/vehicles/${vehicleId}/telemetry-summary`, {
        method: "PATCH",
        body: summary,
        context
      });
    }
  });
}
