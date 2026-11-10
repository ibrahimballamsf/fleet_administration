import { Router } from "express";
import { asyncHandler } from "@fleet/shared/http";
import { authorizeRoles, createAuthenticationMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createVehicleBodySchema,
  listVehiclesQuerySchema,
  updateTelemetrySummaryBodySchema,
  updateVehicleBodySchema,
  updateVehicleStatusBodySchema,
  vehicleIdParamsSchema
} from "../validation/vehicle-schemas.js";

export function createVehicleRouter({ controller, tokenVerifier }) {
  const router = Router();
  router.use(createAuthenticationMiddleware(tokenVerifier));

  router.post(
    "/",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ body: createVehicleBodySchema }),
    asyncHandler(controller.create)
  );
  router.get(
    "/",
    validateRequest({ query: listVehiclesQuerySchema }),
    asyncHandler(controller.list)
  );
  router.get(
    "/:id/status-history",
    validateRequest({ params: vehicleIdParamsSchema }),
    asyncHandler(controller.statusHistory)
  );
  router.patch(
    "/:id/status",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: vehicleIdParamsSchema, body: updateVehicleStatusBodySchema }),
    asyncHandler(controller.updateStatus)
  );
  router.patch(
    "/:id/telemetry-summary",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: vehicleIdParamsSchema, body: updateTelemetrySummaryBodySchema }),
    asyncHandler(controller.updateTelemetrySummary)
  );
  router.get(
    "/:id",
    validateRequest({ params: vehicleIdParamsSchema }),
    asyncHandler(controller.getById)
  );
  router.patch(
    "/:id",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: vehicleIdParamsSchema, body: updateVehicleBodySchema }),
    asyncHandler(controller.update)
  );
  router.delete(
    "/:id",
    authorizeRoles("admin"),
    validateRequest({ params: vehicleIdParamsSchema }),
    asyncHandler(controller.remove)
  );
  return router;
}
