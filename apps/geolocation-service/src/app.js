import express from "express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createGeolocationController } from "./controllers/geolocation-controller.js";
import { createGeolocationRouter } from "./routes/geolocation-routes.js";

export function createGeolocationApplication({ geolocationService, tokenVerifier, onError } = {}) {
  if (!geolocationService || !tokenVerifier) {
    throw new Error("geolocationService and tokenVerifier are required.");
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));
  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "geolocation-service", status: "ok" } })
  );
  app.use(
    "/api/maps",
    createGeolocationRouter({
      controller: createGeolocationController(geolocationService),
      tokenVerifier
    })
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
