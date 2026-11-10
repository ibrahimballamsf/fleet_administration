import { z } from "@fleet/shared/config";
import { NOTIFICATION_STATUSES, NOTIFICATION_TRIGGERS } from "../models/index.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID must be a MongoDB ObjectId");
const phoneNumber = z.string().trim().regex(/^\+[1-9]\d{7,14}$/);

const eventSchema = z
  .object({
    type: z.enum(NOTIFICATION_TRIGGERS),
    vehicleId: objectId,
    registrationNumber: z.string().trim().max(32).optional(),
    previousStatus: z.string().trim().max(50).optional(),
    newStatus: z.string().trim().max(50).optional(),
    reason: z.string().trim().max(500).optional(),
    changedByUserId: z.string().trim().max(100).optional(),
    severity: z.enum(["information", "warning", "critical"]).optional(),
    telemetryId: objectId.optional(),
    eventId: objectId.optional(),
    message: z.string().trim().max(1600).optional(),
    occurredAt: z.coerce.date().optional()
  })
  .strict();

const directMessageSchema = z
  .object({
    recipientUserId: z.string().trim().min(1).max(100),
    recipientPhoneNumber: phoneNumber,
    vehicleId: objectId,
    triggerType: z.enum(NOTIFICATION_TRIGGERS),
    triggerReferenceId: z.string().trim().max(100).optional(),
    message: z.string().trim().min(1).max(1600)
  })
  .strict();

export const sendNotificationBodySchema = z.union([
  z.object({ event: eventSchema }).strict(),
  directMessageSchema
]);

export const notificationIdParamsSchema = z.object({ id: objectId }).strict();

export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(NOTIFICATION_STATUSES).optional(),
    triggerType: z.enum(NOTIFICATION_TRIGGERS).optional(),
    vehicleId: objectId.optional()
  })
  .strict();
