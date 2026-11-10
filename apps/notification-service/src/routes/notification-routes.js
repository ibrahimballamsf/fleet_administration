import { Router } from "express";
import { asyncHandler } from "@fleet/shared/http";
import { authorizeRoles, createAuthenticationMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  sendNotificationBodySchema
} from "../validation/notification-schemas.js";

export function createNotificationRouter({ controller, tokenVerifier }) {
  const router = Router();
  router.use(createAuthenticationMiddleware(tokenVerifier));

  router.post(
    "/send",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ body: sendNotificationBodySchema }),
    asyncHandler(controller.send)
  );
  router.get(
    "/",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ query: listNotificationsQuerySchema }),
    asyncHandler(controller.list)
  );
  router.post(
    "/:id/retry",
    authorizeRoles("admin"),
    validateRequest({ params: notificationIdParamsSchema }),
    asyncHandler(controller.retry)
  );
  router.get(
    "/:id",
    authorizeRoles("admin", "dispatcher"),
    validateRequest({ params: notificationIdParamsSchema }),
    asyncHandler(controller.getById)
  );
  return router;
}
