import { sendSuccess } from "@fleet/shared/http";

export function createGeolocationController(service) {
  return Object.freeze({
    async geocode(request, response) {
      return sendSuccess(response, { data: await service.geocode(request.validated.body) });
    },
    async updateLocation(request, response) {
      return sendSuccess(response, {
        data: await service.updateLocation(
          request.validated.params.vehicleId,
          request.validated.body
        )
      });
    },
    async getLocation(request, response) {
      return sendSuccess(response, {
        data: await service.getVehicleLocation(request.validated.params.vehicleId)
      });
    },
    async nearby(request, response) {
      return sendSuccess(response, { data: await service.nearby(request.validated.query) });
    },
    async nearbyVehicle(request, response) {
      return sendSuccess(response, {
        data: await service.nearbyVehicle(
          request.validated.params.vehicleId,
          request.validated.query
        )
      });
    },
    async listLocations(request, response) {
      return sendSuccess(response, {
        data: await service.listLocations(request.validated.query.limit)
      });
    }
  });
}
