import { ForbiddenError, UnauthorizedError } from "@fleet/shared/http";

export function createAuthenticationMiddleware(tokenService) {
  return function authenticate(request, _response, next) {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) return next(new UnauthorizedError("A Bearer token is required"));

    try {
      const payload = tokenService.verify(match[1]);
      if (!payload.sub || !payload.role) {
        return next(new UnauthorizedError("The access token is invalid"));
      }

      request.user = {
        id: payload.sub,
        role: payload.role,
        email: payload.email
      };
      return next();
    } catch {
      return next(new UnauthorizedError("The access token is invalid or expired"));
    }
  };
}

export function authorizeRoles(...allowedRoles) {
  return function authorize(request, _response, next) {
    if (!allowedRoles.includes(request.user?.role)) {
      return next(new ForbiddenError());
    }
    return next();
  };
}

export function authorizeSelfOrRoles(...allowedRoles) {
  return function authorize(request, _response, next) {
    const targetUserId = request.validated?.params?.id ?? request.params.id;
    if (request.user?.id === targetUserId || allowedRoles.includes(request.user?.role)) {
      return next();
    }
    return next(new ForbiddenError());
  };
}
