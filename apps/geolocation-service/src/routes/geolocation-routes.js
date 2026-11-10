import { Router } from "express";
import { asyncHandler } from "@fleet/shared/http";
import { authorizeRoles, createAuthenticationMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  geocodeBodySchema,
  listLocationsQuerySchema,
  nearbyQuerySchema,
  nearbyVehicleQuerySchema,
  updateLocationBodySchema,
  vehicleIdParamsSchema
} from "../validation/geolocation-schemas.js";

export function createGeolocationRouter({ controller, tokenVerifier }) {
  const router = Router();
  router.use(createAuthenticationMiddleware(tokenVerifier));

  router.post(
    "/geocode",
    validateRequest({ body: geocodeBodySchema }),
    asyncHandler(controller.geocode)
  );
  router.get(
    "/vehicles/nearby",
    validateRequest({ query: nearbyQuerySchema }),
    asyncHandler(controller.nearby)
  );
  router.get(
    "/vehicles",
    validateRequest({ query: listLocationsQuerySchema }),
    asyncHandler(controller.listLocations)
  );
  router.put(
    "/vehicles/:vehicleId/location",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: vehicleIdParamsSchema, body: updateLocationBodySchema }),
    asyncHandler(controller.updateLocation)
  );
  router.get(
    "/vehicles/:vehicleId/location",
    validateRequest({ params: vehicleIdParamsSchema }),
    asyncHandler(controller.getLocation)
  );
  router.get(
    "/vehicles/:vehicleId/nearby",
    validateRequest({ params: vehicleIdParamsSchema, query: nearbyVehicleQuerySchema }),
    asyncHandler(controller.nearbyVehicle)
  );
  return router;
}
