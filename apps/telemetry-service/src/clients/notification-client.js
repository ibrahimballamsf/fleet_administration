import { requestJson } from "./http.js";

export function createNotificationClient({ baseUrl }) {
  return Object.freeze({
    sendCriticalEvent(event, context) {
      return requestJson(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        body: { event },
        context
      });
    }
  });
}
