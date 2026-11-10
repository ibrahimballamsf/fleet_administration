import { rateLimit } from "express-rate-limit";
import { ErrorCodes, errorResponse } from "@fleet/shared/http";

export function createGatewayRateLimiter({ windowMs, maxRequests }) {
  return rateLimit({
    windowMs,
    limit: maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (request) => request.apiKeyHash ?? "unverified-client",
    handler(request, response) {
      response.status(429).json(
        errorResponse({
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: "Too many requests",
          details: [],
          requestId: request.id
        })
      );
    }
  });
}
