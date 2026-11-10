import { sendNoContent, sendSuccess } from "@fleet/shared/http";

export function createVehicleController(vehicleService) {
  return Object.freeze({
    async create(request, response) {
      const vehicle = await vehicleService.create(request.validated.body, request.user);
      return sendSuccess(response, { data: vehicle, statusCode: 201 });
    },
    async list(request, response) {
      const result = await vehicleService.list(request.validated.query);
      return sendSuccess(response, { data: result.vehicles, meta: result.meta });
    },
    async getById(request, response) {
      return sendSuccess(response, {
        data: await vehicleService.getById(request.validated.params.id)
      });
    },
    async update(request, response) {
      return sendSuccess(response, {
        data: await vehicleService.update(request.validated.params.id, request.validated.body)
      });
    },
    async updateStatus(request, response) {
      return sendSuccess(response, {
        data: await vehicleService.updateStatus(
          request.validated.params.id,
          request.validated.body,
          request.user,
          request.id
        )
      });
    },
    async updateTelemetrySummary(request, response) {
      return sendSuccess(response, {
        data: await vehicleService.updateTelemetrySummary(
          request.validated.params.id,
          request.validated.body
        )
      });
    },
    async statusHistory(request, response) {
      return sendSuccess(response, {
        data: await vehicleService.statusHistory(request.validated.params.id)
      });
    },
    async remove(request, response) {
      await vehicleService.remove(request.validated.params.id);
      return sendNoContent(response);
    }
  });
}
