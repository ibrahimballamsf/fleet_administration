import { createHash, timingSafeEqual } from "node:crypto";
import { ForbiddenError, UnauthorizedError } from "@fleet/shared/http";

function digest(value) {
  return createHash("sha256").update(value).digest();
}

export function createApiKeyMiddleware(apiKeys) {
  const acceptedDigests = apiKeys.map(digest);

  return function verifyApiKey(request, _response, next) {
    const supplied = request.get("x-api-key");
    if (!supplied) return next(new UnauthorizedError("X-API-Key is required"));

    const suppliedDigest = digest(supplied);
    const valid = acceptedDigests.some((accepted) => timingSafeEqual(accepted, suppliedDigest));
    if (!valid) return next(new ForbiddenError("The API key is invalid"));

    request.apiKeyHash = suppliedDigest.toString("hex");
    return next();
  };
}
