import { sendSuccess } from "@fleet/shared/http";

export function createNotificationController(service) {
  return Object.freeze({
    async send(request, response) {
      return sendSuccess(response, {
        data: await service.send(request.validated.body),
        statusCode: 201
      });
    },
    async list(request, response) {
      const result = await service.list(request.validated.query);
      return sendSuccess(response, { data: result.notifications, meta: result.meta });
    },
    async getById(request, response) {
      return sendSuccess(response, {
        data: await service.getById(request.validated.params.id)
      });
    },
    async retry(request, response) {
      return sendSuccess(response, {
        data: await service.retry(request.validated.params.id)
      });
    }
  });
}
