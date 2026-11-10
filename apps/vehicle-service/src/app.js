import express from "express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createVehicleController } from "./controllers/vehicle-controller.js";
import { createVehicleRouter } from "./routes/vehicle-routes.js";

export function createVehicleApplication({ vehicleService, tokenVerifier, onError } = {}) {
  if (!vehicleService || !tokenVerifier) {
    throw new Error("vehicleService and tokenVerifier are required to create the Vehicle Service app.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));
  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "vehicle-service", status: "ok" } })
  );
  app.use(
    "/api/vehicles",
    createVehicleRouter({ controller: createVehicleController(vehicleService), tokenVerifier })
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
