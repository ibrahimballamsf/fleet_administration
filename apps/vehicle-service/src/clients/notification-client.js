import { ServiceUnavailableError } from "@fleet/shared/http";

export function createNotificationClient({ baseUrl, timeoutMs = 5000, fetchImplementation = fetch }) {
  return Object.freeze({
    async notifyStatusChange(event) {
      let response;
      try {
        response = await fetchImplementation(`${baseUrl}/api/notifications/send`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(event.requestId ? { "x-request-id": event.requestId } : {})
          },
          body: JSON.stringify({
            event: {
              type: "status_change",
              vehicleId: event.vehicle.id,
              registrationNumber: event.vehicle.registrationNumber,
              previousStatus: event.previousStatus,
              newStatus: event.newStatus,
              reason: event.reason,
              changedByUserId: event.changedByUserId
            }
          }),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (error) {
        throw new ServiceUnavailableError("Notification Service is unavailable", { cause: error });
      }

      if (!response.ok) {
        throw new ServiceUnavailableError("Notification Service rejected the status event");
      }
      return response.json();
    }
  });
}
