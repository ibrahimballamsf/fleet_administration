import { Router } from "express";
import { asyncHandler } from "@fleet/shared/http";
import { authorizeRoles, createAuthenticationMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  eventBodySchema,
  telemetryBodySchema,
  telemetryHistoryQuerySchema,
  vehicleParamsSchema
} from "../validation/telemetry-schemas.js";

export function createTelemetryRouter({ controller, tokenVerifier }) {
  const router = Router();
  router.use(createAuthenticationMiddleware(tokenVerifier));

  router.post(
    "/",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ body: telemetryBodySchema }),
    asyncHandler(controller.submit)
  );
  router.get(
    "/vehicle/:vehicleId/latest",
    validateRequest({ params: vehicleParamsSchema }),
    asyncHandler(controller.latest)
  );
  router.post(
    "/vehicle/:vehicleId/events",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: vehicleParamsSchema, body: eventBodySchema }),
    asyncHandler(controller.submitEvent)
  );
  router.get(
    "/vehicle/:vehicleId/events",
    validateRequest({ params: vehicleParamsSchema }),
    asyncHandler(controller.events)
  );
  router.get(
    "/vehicle/:vehicleId",
    validateRequest({ params: vehicleParamsSchema, query: telemetryHistoryQuerySchema }),
    asyncHandler(controller.history)
  );
  return router;
}
