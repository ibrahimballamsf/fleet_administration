export const ErrorCodes = Object.freeze({
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT"
});

export class HttpError extends Error {
  constructor({
    statusCode = 500,
    code = ErrorCodes.INTERNAL_ERROR,
    message = "An unexpected error occurred",
    details = [],
    expose = statusCode < 500,
    cause
  } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
    this.expose = expose;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "The request is invalid", options = {}) {
    super({ statusCode: 400, code: ErrorCodes.BAD_REQUEST, message, ...options });
  }
}

export class ValidationError extends BadRequestError {
  constructor(message = "The request contains invalid data", options = {}) {
    super(message, { code: ErrorCodes.VALIDATION_ERROR, ...options });
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication is required", options = {}) {
    super({ statusCode: 401, code: ErrorCodes.UNAUTHORIZED, message, ...options });
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have permission to perform this action", options = {}) {
    super({ statusCode: 403, code: ErrorCodes.FORBIDDEN, message, ...options });
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "The requested resource was not found", options = {}) {
    super({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message, ...options });
  }
}

export class ConflictError extends HttpError {
  constructor(message = "The request conflicts with the current resource state", options = {}) {
    super({ statusCode: 409, code: ErrorCodes.CONFLICT, message, ...options });
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = "The requested operation is not valid", options = {}) {
    super({ statusCode: 422, code: ErrorCodes.UNPROCESSABLE_ENTITY, message, ...options });
  }
}

export class RateLimitError extends HttpError {
  constructor(message = "Too many requests", options = {}) {
    super({ statusCode: 429, code: ErrorCodes.RATE_LIMIT_EXCEEDED, message, ...options });
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = "The requested service is temporarily unavailable", options = {}) {
    super({
      statusCode: 503,
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message,
      expose: true,
      ...options
    });
  }
}

export class GatewayTimeoutError extends HttpError {
  constructor(message = "The requested service did not respond in time", options = {}) {
    super({
      statusCode: 504,
      code: ErrorCodes.GATEWAY_TIMEOUT,
      message,
      expose: true,
      ...options
    });
  }
}
