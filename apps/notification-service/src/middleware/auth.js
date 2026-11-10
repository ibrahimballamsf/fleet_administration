import { ForbiddenError, UnauthorizedError } from "@fleet/shared/http";

export function createAuthenticationMiddleware(tokenVerifier) {
  return function authenticate(request, _response, next) {
    const match = request.get("authorization")?.match(/^Bearer\s+(.+)$/i);
    if (!match) return next(new UnauthorizedError("A Bearer token is required"));
    try {
      const payload = tokenVerifier.verify(match[1]);
      if (!payload.sub || !payload.role) return next(new UnauthorizedError("The access token is invalid"));
      request.user = { id: payload.sub, role: payload.role, email: payload.email };
      return next();
    } catch {
      return next(new UnauthorizedError("The access token is invalid or expired"));
    }
  };
}

export function authorizeRoles(...roles) {
  return function authorize(request, _response, next) {
    if (!roles.includes(request.user?.role)) return next(new ForbiddenError());
    return next();
  };
}
