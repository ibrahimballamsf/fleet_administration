import { z } from "@fleet/shared/config";

const vehicleId = z.string().regex(/^[a-f\d]{24}$/i, "Vehicle ID must be a MongoDB ObjectId");
const coordinates = {
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
};

export const geocodeBodySchema = z
  .object({
    address: z.string().trim().min(3).max(500),
    vehicleId: vehicleId.optional()
  })
  .strict();

export const vehicleIdParamsSchema = z.object({ vehicleId }).strict();

export const updateLocationBodySchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    source: z.enum(["telemetry", "geocoded", "manual"]),
    accuracyMeters: z.number().min(0).optional(),
    recordedAt: z.coerce.date().default(() => new Date()),
    address: z.string().trim().max(500).optional()
  })
  .strict();

export const nearbyQuerySchema = z
  .object({
    ...coordinates,
    radiusKm: z.coerce.number().positive(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    excludeVehicleId: vehicleId.optional()
  })
  .strict();

export const nearbyVehicleQuerySchema = z
  .object({
    radiusKm: z.coerce.number().positive(),
    limit: z.coerce.number().int().min(1).max(200).default(50)
  })
  .strict();

export const listLocationsQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(500).default(100) })
  .strict();
