import { Router } from "express";
import { asyncHandler } from "@fleet/shared/http";
import {
  authorizeRoles,
  authorizeSelfOrRoles,
  createAuthenticationMiddleware
} from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  listUsersQuerySchema,
  loginBodySchema,
  registerBodySchema,
  updateRoleBodySchema,
  updateUserBodySchema,
  userIdParamsSchema
} from "../validation/user-schemas.js";

export function createUserRouter({ controller, tokenService }) {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(tokenService);

  router.post(
    "/register",
    validateRequest({ body: registerBodySchema }),
    asyncHandler(controller.register)
  );
  router.post(
    "/login",
    validateRequest({ body: loginBodySchema }),
    asyncHandler(controller.login)
  );

  router.use(authenticate);
  router.get("/me", asyncHandler(controller.me));
  router.get(
    "/",
    authorizeRoles("admin"),
    validateRequest({ query: listUsersQuerySchema }),
    asyncHandler(controller.list)
  );
  router.get(
    "/:id",
    validateRequest({ params: userIdParamsSchema }),
    authorizeSelfOrRoles("admin"),
    asyncHandler(controller.getById)
  );
  router.patch(
    "/:id",
    validateRequest({ params: userIdParamsSchema, body: updateUserBodySchema }),
    authorizeSelfOrRoles("admin"),
    asyncHandler(controller.updateProfile)
  );
  router.patch(
    "/:id/role",
    authorizeRoles("admin"),
    validateRequest({ params: userIdParamsSchema, body: updateRoleBodySchema }),
    asyncHandler(controller.updateRole)
  );

  return router;
}
