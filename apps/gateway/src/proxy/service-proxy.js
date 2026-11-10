import { createProxyMiddleware } from "http-proxy-middleware";
import { ErrorCodes, errorResponse } from "@fleet/shared/http";

function writeProxyError(error, request, response) {
  if (response.headersSent) return;
  const timedOut = error?.code === "ETIMEDOUT" || /timed?\s*out/i.test(error?.message ?? "");
  const statusCode = timedOut ? 504 : 503;
  const payload = errorResponse({
    code: timedOut ? ErrorCodes.GATEWAY_TIMEOUT : ErrorCodes.SERVICE_UNAVAILABLE,
    message: timedOut
      ? "The target service did not respond in time"
      : "The target service is unavailable",
    details: [],
    requestId: request.id
  });
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

export function createServiceProxy({ prefix, target, timeoutMs }) {
  return createProxyMiddleware({
    pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`),
    target,
    changeOrigin: true,
    proxyTimeout: timeoutMs,
    timeout: timeoutMs,
    on: {
      proxyReq(proxyRequest, request) {
        if (request.id) proxyRequest.setHeader("x-request-id", request.id);
      },
      error: writeProxyError
    }
  });
}

export function createServiceProxies({ services, timeoutMs }) {
  return [
    createServiceProxy({ prefix: "/api/users", target: services.users, timeoutMs }),
    createServiceProxy({ prefix: "/api/vehicles", target: services.vehicles, timeoutMs }),
    createServiceProxy({ prefix: "/api/telemetry", target: services.telemetry, timeoutMs }),
    createServiceProxy({ prefix: "/api/maps", target: services.geolocation, timeoutMs }),
    createServiceProxy({ prefix: "/api/notifications", target: services.notifications, timeoutMs })
  ];
}
