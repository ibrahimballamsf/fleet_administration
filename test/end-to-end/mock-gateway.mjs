import http from "node:http";

const port = Number(process.env.E2E_GATEWAY_PORT || 4000);
const frontendUrl = process.env.E2E_FRONTEND_URL || "http://127.0.0.1:3000";

const admin = { id: "507f1f77bcf86cd799439011", name: "E2E Admin", email: "admin@fleet.test", phoneNumber: "+32470000000", role: "admin", isActive: true, notificationPreferences: { criticalEvents: true, statusChanges: true }, createdAt: "2026-09-12T10:00:00.000Z" };
const initialUsers = [
  admin,
  { id: "507f1f77bcf86cd799439012", name: "Maya Dispatcher", email: "maya@fleet.test", phoneNumber: "+32471111111", role: "dispatcher", isActive: true, notificationPreferences: { criticalEvents: true, statusChanges: true }, createdAt: "2026-10-03T09:00:00.000Z" }
];
const vehicle = { id: "vehicle-1", registrationNumber: "BE-214-XF", vin: "1HGBH41JXMN109186", make: "Volvo", model: "FH16", year: 2024, operationalStatus: "operational", latestLocation: { type: "Point", coordinates: [4.3517, 50.8503], updatedAt: "2026-11-08T19:05:04.000Z" }, lastTelemetryAt: "2026-11-08T19:05:04.000Z" };
const initialReadings = [{ id: "telemetry-1", vehicleId: vehicle.id, latitude: 50.8503, longitude: 4.3517, speedKph: 72, batteryPercent: 84, engineCondition: "normal", eventType: "none", severity: "information", recordedAt: "2026-11-08T19:05:04.000Z" }];
const initialNotifications = [
  { id: "notification-1", recipientUserId: admin.id, recipientPhoneNumber: admin.phoneNumber, vehicleId: vehicle.id, triggerType: "engine_fault", status: "sent", provider: "stub", message: "Vehicle BE-214-XF reported an engine fault.", attemptCount: 1, createdAt: "2026-11-08T19:05:04.000Z" },
  { id: "notification-2", recipientUserId: admin.id, recipientPhoneNumber: admin.phoneNumber, vehicleId: vehicle.id, triggerType: "low_battery", status: "failed", provider: "stub", message: "Vehicle BE-214-XF reported a critically low battery.", attemptCount: 1, failureReason: "STUB_FAILURE: Simulated failure", createdAt: "2026-11-08T18:05:04.000Z" }
];

let state;
function reset() {
  state = {
    users: structuredClone(initialUsers),
    readings: structuredClone(initialReadings),
    notifications: structuredClone(initialNotifications)
  };
}
reset();

function headers() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendUrl,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key, X-Request-Id",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  };
}

function send(response, status, payload) {
  response.writeHead(status, headers());
  response.end(status === 204 ? undefined : JSON.stringify(payload));
}

function success(response, data, meta = {}) {
  send(response, 200, { data, meta });
}

function pagination(items) {
  return { pagination: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 } };
}

async function body(request) {
  let source = "";
  for await (const chunk of request) source += chunk;
  return source ? JSON.parse(source) : {};
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return send(response, 204);
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (request.method === "GET" && path === "/health") return success(response, { service: "e2e-mock", status: "ok" });
  if (request.method === "POST" && path === "/__test/reset") { reset(); return success(response, { reset: true }); }

  if (request.method === "POST" && path === "/api/users/login") {
    const input = await body(request);
    if (input.email !== "admin@fleet.test" || input.password !== "password123") {
      return send(response, 401, { error: { code: "UNAUTHORIZED", message: "Email or password is incorrect", details: [] } });
    }
    return success(response, { token: "e2e-jwt-token", tokenType: "Bearer", expiresIn: "1h", user: admin });
  }
  if (request.method === "GET" && path === "/api/users/me") return success(response, admin);
  if (request.method === "GET" && path === "/api/users") {
    let users = [...state.users];
    if (url.searchParams.get("role")) users = users.filter((item) => item.role === url.searchParams.get("role"));
    if (url.searchParams.get("isActive")) users = users.filter((item) => String(item.isActive) === url.searchParams.get("isActive"));
    return success(response, users, pagination(users));
  }
  if (request.method === "POST" && path === "/api/users/register") {
    const input = await body(request);
    const created = { id: `507f1f77bcf86cd7994390${state.users.length + 11}`, name: input.name, email: input.email, phoneNumber: input.phoneNumber, role: "viewer", isActive: true, notificationPreferences: { criticalEvents: true, statusChanges: true }, createdAt: new Date().toISOString() };
    state.users.push(created);
    return send(response, 201, { data: created, meta: {} });
  }
  const roleMatch = path.match(/^\/api\/users\/([^/]+)\/role$/);
  if (request.method === "PATCH" && roleMatch) {
    const input = await body(request);
    const user = state.users.find((item) => item.id === roleMatch[1]);
    user.role = input.role;
    return success(response, user);
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (request.method === "PATCH" && userMatch) {
    const input = await body(request);
    const user = state.users.find((item) => item.id === userMatch[1]);
    Object.assign(user, input);
    return success(response, user);
  }

  if (request.method === "GET" && path === "/api/vehicles") {
    const items = !url.searchParams.get("status") || url.searchParams.get("status") === vehicle.operationalStatus ? [vehicle] : [];
    return success(response, items, pagination(items));
  }
  if (request.method === "GET" && path === "/api/maps/vehicles") {
    return success(response, [{ vehicleId: vehicle.id, latitude: 50.8503, longitude: 4.3517, source: "telemetry", recordedAt: vehicle.lastTelemetryAt }]);
  }

  if (request.method === "POST" && path === "/api/telemetry") {
    const input = await body(request);
    const reading = { id: `telemetry-${state.readings.length + 1}`, ...input };
    state.readings.unshift(reading);
    return send(response, 201, { data: { telemetry: reading, integrations: { geolocation: { status: "synchronized" }, vehicleSummary: { status: "synchronized" }, notification: { status: "not_required" } } }, meta: {} });
  }
  const telemetryMatch = path.match(/^\/api\/telemetry\/vehicle\/([^/]+)(?:\/(latest|events))?$/);
  if (request.method === "GET" && telemetryMatch) {
    if (telemetryMatch[2] === "latest") return success(response, state.readings[0]);
    if (telemetryMatch[2] === "events") return success(response, [{ id: "event-1", vehicleId: vehicle.id, type: "engine_fault", severity: "critical", message: "Engine diagnostic fault detected", occurredAt: "2026-11-08T17:05:04.000Z", processingStatus: "notification_sent" }]);
    return success(response, state.readings, pagination(state.readings));
  }

  if (request.method === "GET" && path === "/api/notifications") {
    let items = [...state.notifications];
    if (url.searchParams.get("status")) items = items.filter((item) => item.status === url.searchParams.get("status"));
    return success(response, items, pagination(items));
  }
  const retryMatch = path.match(/^\/api\/notifications\/([^/]+)\/retry$/);
  if (request.method === "POST" && retryMatch) {
    const item = state.notifications.find((notification) => notification.id === retryMatch[1]);
    item.status = "sent";
    item.attemptCount += 1;
    return success(response, item);
  }
  const notificationMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
  if (request.method === "GET" && notificationMatch) {
    const item = state.notifications.find((notification) => notification.id === notificationMatch[1]);
    return success(response, { ...item, attempts: [{ id: "attempt-1", attemptNumber: 1, provider: "stub", status: item.status, requestedAt: item.createdAt, completedAt: item.createdAt }] });
  }

  return send(response, 404, { error: { code: "NOT_FOUND", message: `No E2E mock for ${request.method} ${path}`, details: [] } });
});

server.listen(port, "127.0.0.1", () => console.log(`E2E mock gateway listening on http://127.0.0.1:${port}`));
