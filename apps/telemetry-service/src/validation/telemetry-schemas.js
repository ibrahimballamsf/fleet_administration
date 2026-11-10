import { z } from "@fleet/shared/config";
import { EVENT_SEVERITIES, EVENT_TYPES } from "../models/index.js";

const vehicleId = z.string().regex(/^[a-f\d]{24}$/i, "Vehicle ID must be a MongoDB ObjectId");
const criticalEventTypes = EVENT_TYPES.filter((type) => type !== "none");

export const telemetryBodySchema = z
  .object({
    vehicleId,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speedKph: z.number().min(0).optional(),
    batteryPercent: z.number().min(0).max(100).optional(),
    engineCondition: z.enum(["normal", "warning", "fault", "off"]).default("normal"),
    odometerKm: z.number().min(0).optional(),
    eventType: z.enum(EVENT_TYPES).default("none"),
    severity: z.enum(EVENT_SEVERITIES).optional(),
    recordedAt: z.coerce.date().default(() => new Date()),
    rawPayload: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export const vehicleParamsSchema = z.object({ vehicleId }).strict();

export const telemetryHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict();

export const eventBodySchema = z
  .object({
    type: z.enum(criticalEventTypes),
    severity: z.enum(EVENT_SEVERITIES).optional(),
    message: z.string().trim().max(500).optional(),
    occurredAt: z.coerce.date().default(() => new Date())
  })
  .strict();
