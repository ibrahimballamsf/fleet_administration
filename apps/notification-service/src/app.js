import express from "express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createNotificationController } from "./controllers/notification-controller.js";
import { createNotificationRouter } from "./routes/notification-routes.js";

export function createNotificationApplication({ notificationService, tokenVerifier, onError } = {}) {
  if (!notificationService || !tokenVerifier) {
    throw new Error("notificationService and tokenVerifier are required.");
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));
  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "notification-service", status: "ok" } })
  );
  app.use(
    "/api/notifications",
    createNotificationRouter({
      controller: createNotificationController(notificationService),
      tokenVerifier
    })
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
