import { randomUUID } from "node:crypto";
import { ErrorCodes, HttpError, NotFoundError, ValidationError } from "./errors.js";
import { errorResponse } from "./responses.js";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function suppliedRequestId(request) {
  const value = request.get?.("x-request-id") ?? request.headers?.["x-request-id"];
  return typeof value === "string" && SAFE_REQUEST_ID.test(value) ? value : undefined;
}

export function requestIdMiddleware(request, response, next) {
  request.id = suppliedRequestId(request) ?? randomUUID();
  response.setHeader("X-Request-Id", request.id);
  next();
}

export function asyncHandler(handler) {
  return function asynchronousRouteHandler(request, response, next) {
    return Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function notFoundHandler(request, _response, next) {
  const method = request.method ?? "UNKNOWN";
  const path = request.originalUrl ?? request.url ?? "unknown";
  next(
    new NotFoundError(`Route ${method} ${path} was not found`, {
      code: ErrorCodes.ROUTE_NOT_FOUND
    })
  );
}

function zodDetails(error) {
  return error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.join("."),
    message: issue.message
  }));
}

export function normalizeHttpError(error) {
  if (error instanceof HttpError) return error;

  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return new ValidationError(undefined, { details: zodDetails(error), cause: error });
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return new ValidationError("The request body contains invalid JSON", { cause: error });
  }

  return new HttpError({ cause: error });
}

export function createErrorHandler({ onError } = {}) {
  return function errorHandler(error, request, response, next) {
    if (response.headersSent) {
      return next(error);
    }

    const normalized = normalizeHttpError(error);
    const requestId = request.id ?? null;

    onError?.({
      error,
      code: normalized.code,
      statusCode: normalized.statusCode,
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url
    });

    const message = normalized.expose
      ? normalized.message
      : "An unexpected error occurred";
    const details = normalized.expose ? normalized.details : [];

    return response.status(normalized.statusCode).json(
      errorResponse({ code: normalized.code, message, details, requestId })
    );
  };
}
