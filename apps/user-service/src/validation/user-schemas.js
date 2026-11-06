import { z } from "@fleet/shared/config";
import { USER_ROLES } from "../models/index.js";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phoneNumber = z.string().trim().regex(/^\+[1-9]\d{7,14}$/);
const userId = z.string().regex(/^[a-f\d]{24}$/i, "User ID must be a MongoDB ObjectId");

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password: z.string().min(8).max(72),
  phoneNumber: phoneNumber.optional()
}).strict();

export const loginBodySchema = z.object({
  email,
  password: z.string().min(1).max(72)
}).strict();

export const userIdParamsSchema = z.object({ id: userId }).strict();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional()
}).strict();

export const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phoneNumber: phoneNumber.nullable().optional(),
    notificationPreferences: z
      .object({
        criticalEvents: z.boolean().optional(),
        statusChanges: z.boolean().optional()
      })
      .strict()
      .optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one profile field is required");

export const updateRoleBodySchema = z.object({ role: z.enum(USER_ROLES) }).strict();
