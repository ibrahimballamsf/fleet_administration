/**
 *  This script performs a smoke test for the Fleet Docker setup.
 *  It checks the readiness of the gateway and frontend, performs a login,
 *  and verifies the expected counts of vehicles and notifications.
 */

const gatewayUrl = process.env.SMOKE_GATEWAY_URL || "http://127.0.0.1:4000";
const frontendUrl = process.env.SMOKE_FRONTEND_URL || "http://127.0.0.1:3000";
const apiKey = process.env.SMOKE_API_KEY || "development-api-key";
const email = process.env.SMOKE_EMAIL || "admin@fleet.test";
const password = process.env.SMOKE_PASSWORD || "FleetDemo123!";
const attempts = Number(process.env.SMOKE_ATTEMPTS || 30);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS || 2_000);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) await delay(retryDelayMs);
  }

  throw new Error(`Smoke check failed after ${attempts} attempts: ${lastError?.message || "unknown error"}`);
}

function extractItems(payload) {
  const value = payload?.data?.items
    ?? payload?.data?.vehicles
    ?? payload?.data?.notifications
    ?? payload?.data
    ?? payload;
  return Array.isArray(value) ? value : [];
}

const readyResponse = await fetchWithRetry(`${gatewayUrl}/ready`);
const readyPayload = await readyResponse.json();
const frontendResponse = await fetchWithRetry(frontendUrl);
const loginResponse = await fetchWithRetry(`${gatewayUrl}/api/users/login`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": apiKey
  },
  body: JSON.stringify({ email, password })
});
const loginPayload = await loginResponse.json();
const accessToken = loginPayload?.data?.accessToken
  ?? loginPayload?.accessToken
  ?? loginPayload?.data?.token
  ?? loginPayload?.token;

if (!accessToken) throw new Error("Smoke login succeeded without returning an access token.");

const authorizationHeaders = {
  authorization: `Bearer ${accessToken}`,
  "x-api-key": apiKey
};
const expectedCounts = new Map([
  ["/api/vehicles", 5],
  ["/api/maps/vehicles", 5],
  ["/api/notifications", 4]
]);
const counts = {};

for (const [path, expectedCount] of expectedCounts) {
  const response = await fetchWithRetry(`${gatewayUrl}${path}`, { headers: authorizationHeaders });
  const items = extractItems(await response.json());
  counts[path] = items.length;
  if (items.length !== expectedCount) {
    throw new Error(`${path} returned ${items.length} records; expected ${expectedCount}.`);
  }
}

console.log("Fleet Docker smoke test passed", {
  gatewayStatus: readyPayload?.status || "ready",
  frontendStatus: frontendResponse.status,
  loginStatus: loginResponse.status,
  counts
});
