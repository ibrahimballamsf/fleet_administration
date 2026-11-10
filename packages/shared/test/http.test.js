import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  ErrorCodes,
  ForbiddenError,
  asyncHandler,
  createErrorHandler,
  createPaginationMeta,
  normalizeHttpError,
  notFoundHandler,
  requestIdMiddleware,
  sendNoContent,
  sendSuccess,
  successResponse
} from "../src/http/index.js";

function createResponse() {
  return {
    body: undefined,
    headers: {},
    headersSent: false,
    statusCode: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send() {
      this.sent = true;
      return this;
    }
  };
}

test("creates consistent success and pagination envelopes", () => {
  assert.deepEqual(successResponse({ id: "vehicle-1" }), {
    data: { id: "vehicle-1" },
    meta: {}
  });

  assert.deepEqual(createPaginationMeta({ page: 2, pageSize: 10, totalItems: 25 }), {
    pagination: {
      page: 2,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true
    }
  });
});

test("sends JSON success and empty responses with the requested status", () => {
  const createdResponse = createResponse();
  sendSuccess(createdResponse, { data: { id: "vehicle-1" }, statusCode: 201 });
  assert.equal(createdResponse.statusCode, 201);
  assert.deepEqual(createdResponse.body.meta, {});

  const emptyResponse = createResponse();
  sendNoContent(emptyResponse);
  assert.equal(emptyResponse.statusCode, 204);
  assert.equal(emptyResponse.sent, true);
});

test("propagates safe request IDs and replaces unsafe values", () => {
  const response = createResponse();
  const request = { headers: { "x-request-id": "client-request:123" } };
  let nextCalled = false;
  requestIdMiddleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.id, "client-request:123");
  assert.equal(response.headers["X-Request-Id"], request.id);

  const unsafeRequest = { headers: { "x-request-id": "invalid value with spaces" } };
  const unsafeResponse = createResponse();
  requestIdMiddleware(unsafeRequest, unsafeResponse, () => {});
  assert.match(unsafeRequest.id, /^[0-9a-f-]{36}$/);
});

test("turns unmatched routes into a consistent not-found error", () => {
  let captured;
  notFoundHandler(
    { method: "GET", originalUrl: "/api/missing" },
    createResponse(),
    (error) => {
      captured = error;
    }
  );

  assert.equal(captured.statusCode, 404);
  assert.equal(captured.code, ErrorCodes.ROUTE_NOT_FOUND);
});

test("serializes exposed errors and preserves the request ID", () => {
  const response = createResponse();
  createErrorHandler()(
    new ForbiddenError(),
    { id: "request-123", method: "DELETE", originalUrl: "/api/vehicles/1" },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, ErrorCodes.FORBIDDEN);
  assert.equal(response.body.error.requestId, "request-123");
});

test("does not expose unexpected internal error messages", () => {
  const response = createResponse();
  createErrorHandler()(
    new Error("database credentials appeared here"),
    { id: "request-456", method: "GET", originalUrl: "/api/vehicles" },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.code, ErrorCodes.INTERNAL_ERROR);
  assert.equal(response.body.error.message, "An unexpected error occurred");
  assert.doesNotMatch(JSON.stringify(response.body), /database credentials/);
});

test("normalizes Zod issues into safe validation details", () => {
  const result = z.object({ radiusKm: z.number().positive() }).safeParse({ radiusKm: -1 });
  const normalized = normalizeHttpError(result.error);

  assert.equal(normalized.statusCode, 400);
  assert.equal(normalized.code, ErrorCodes.VALIDATION_ERROR);
  assert.equal(normalized.details[0].path, "radiusKm");
});

test("normalizes malformed JSON without exposing parser details", () => {
  const parserError = new SyntaxError("Unexpected token containing request data");
  parserError.status = 400;
  const normalized = normalizeHttpError(parserError);

  assert.equal(normalized.statusCode, 400);
  assert.equal(normalized.code, ErrorCodes.VALIDATION_ERROR);
  assert.equal(normalized.message, "The request body contains invalid JSON");
});

test("rejects invalid pagination inputs", () => {
  assert.throws(
    () => createPaginationMeta({ page: 0, pageSize: 10, totalItems: 5 }),
    /page must be/
  );
  assert.throws(
    () => createPaginationMeta({ page: 1, pageSize: 10, totalItems: -1 }),
    /totalItems must be/
  );
});

test("delegates errors when response headers were already sent", () => {
  const expected = new Error("stream failed");
  const response = createResponse();
  response.headersSent = true;
  let delegated;

  createErrorHandler()(expected, {}, response, (error) => {
    delegated = error;
  });

  assert.equal(delegated, expected);
  assert.equal(response.statusCode, undefined);
});

test("forwards rejected asynchronous route handlers", async () => {
  const expected = new Error("route failed");
  let captured;
  const handler = asyncHandler(async () => {
    throw expected;
  });

  await handler({}, {}, (error) => {
    captured = error;
  });

  assert.equal(captured, expected);
});
