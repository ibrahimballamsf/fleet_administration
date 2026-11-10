import { sendSuccess } from "@fleet/shared/http";

function integrationContext(request) {
  return { accessToken: request.accessToken, requestId: request.id };
}

export function createTelemetryController(service) {
  return Object.freeze({
    async submit(request, response) {
      return sendSuccess(response, {
        data: await service.submit(request.validated.body, integrationContext(request)),
        statusCode: 201
      });
    },
    async history(request, response) {
      const result = await service.history(
        request.validated.params.vehicleId,
        request.validated.query
      );
      return sendSuccess(response, { data: result.telemetry, meta: result.meta });
    },
    async latest(request, response) {
      return sendSuccess(response, {
        data: await service.latest(request.validated.params.vehicleId)
      });
    },
    async submitEvent(request, response) {
      return sendSuccess(response, {
        data: await service.submitEvent(
          request.validated.params.vehicleId,
          request.validated.body,
          integrationContext(request)
        ),
        statusCode: 201
      });
    },
    async events(request, response) {
      return sendSuccess(response, {
        data: await service.events(request.validated.params.vehicleId)
      });
    }
  });
}
