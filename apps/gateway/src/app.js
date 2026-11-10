import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import {
  createErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  sendSuccess
} from "@fleet/shared/http";
import { createApiKeyMiddleware } from "./middleware/api-key.js";
import { createGatewayRateLimiter } from "./middleware/rate-limit.js";
import { createServiceProxies } from "./proxy/service-proxy.js";
import { createReadinessHandler } from "./readiness.js";

export function createGatewayApplication({ gatewayConfig, openApiDocument, fetchImplementation, onError } = {}) {
  if (!gatewayConfig || !openApiDocument) {
    throw new Error("gatewayConfig and openApiDocument are required.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || gatewayConfig.corsOrigins.includes(origin));
      },
      allowedHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"]
    })
  );

  app.get("/health", (_request, response) =>
    sendSuccess(response, { data: { service: "gateway", status: "ok" } })
  );
  app.get(
    "/ready",
    createReadinessHandler({
      services: gatewayConfig.services,
      fetchImplementation,
      timeoutMs: Math.min(gatewayConfig.proxyTimeoutMs, 2000)
    })
  );
  app.get("/api-docs/openapi.json", (_request, response) => response.json(openApiDocument));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "Fleet Administration API",
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true }
    })
  );

  app.use(createApiKeyMiddleware(gatewayConfig.apiKeys));
  app.use(createGatewayRateLimiter(gatewayConfig.rateLimit));
  for (const proxy of createServiceProxies({
    services: gatewayConfig.services,
    timeoutMs: gatewayConfig.proxyTimeoutMs
  })) {
    app.use(proxy);
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler({ onError }));
  return app;
}
