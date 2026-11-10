import { z } from "@fleet/shared/config";
import { VEHICLE_STATUSES } from "../models/index.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID must be a MongoDB ObjectId");
const currentYear = new Date().getUTCFullYear();
const vin = z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/);

const addressSchema = z
  .object({
    line1: z.string().trim().max(200).optional(),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(120).optional(),
    region: z.string().trim().max(120).optional(),
    postalCode: z.string().trim().max(32).optional(),
    country: z.string().trim().max(120).optional()
  })
  .strict();

const locationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    recordedAt: z.coerce.date().default(() => new Date())
  })
  .strict();

export const vehicleIdParamsSchema = z.object({ id: objectId }).strict();

export const createVehicleBodySchema = z
  .object({
    registrationNumber: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()),
    vin: vin.optional(),
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    year: z.number().int().min(1886).max(currentYear + 1).optional(),
    address: addressSchema.optional(),
    operationalStatus: z.enum(VEHICLE_STATUSES).default("operational"),
    assignedUserId: objectId.optional(),
    location: locationSchema.optional()
  })
  .strict();

export const updateVehicleBodySchema = z
  .object({
    registrationNumber: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()).optional(),
    vin: vin.nullable().optional(),
    make: z.string().trim().min(1).max(80).optional(),
    model: z.string().trim().min(1).max(80).optional(),
    year: z.number().int().min(1886).max(currentYear + 1).nullable().optional(),
    address: addressSchema.nullable().optional(),
    assignedUserId: objectId.nullable().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one vehicle field is required");

export const updateVehicleStatusBodySchema = z
  .object({
    status: z.enum(VEHICLE_STATUSES),
    reason: z.string().trim().min(1).max(500).optional()
  })
  .strict();

export const updateTelemetrySummaryBodySchema = z
  .object({
    recordedAt: z.coerce.date(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
  .strict();

export const listVehiclesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(VEHICLE_STATUSES).optional(),
    registrationNumber: z.string().trim().max(32).transform((value) => value.toUpperCase()).optional(),
    make: z.string().trim().max(80).optional(),
    model: z.string().trim().max(80).optional()
  })
  .strict();
