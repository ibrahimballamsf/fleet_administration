import express from "express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createUserController } from "./controllers/user-controller.js";
import { createUserRouter } from "./routes/user-routes.js";

export function createUserApplication({ userService, tokenService, onError } = {}) {
  if (!userService || !tokenService) {
    throw new Error("userService and tokenService are required to create the User Service app.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "user-service", status: "ok" } })
  );

  const controller = createUserController(userService);
  app.use("/api/users", createUserRouter({ controller, tokenService }));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
