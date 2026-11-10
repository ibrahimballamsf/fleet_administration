import express from "express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createTelemetryController } from "./controllers/telemetry-controller.js";
import { createTelemetryRouter } from "./routes/telemetry-routes.js";

export function createTelemetryApplication({ telemetryService, tokenVerifier, onError } = {}) {
  if (!telemetryService || !tokenVerifier) {
    throw new Error("telemetryService and tokenVerifier are required.");
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "250kb" }));
  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "telemetry-service", status: "ok" } })
  );
  app.use(
    "/api/telemetry",
    createTelemetryRouter({
      controller: createTelemetryController(telemetryService),
      tokenVerifier
    })
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
