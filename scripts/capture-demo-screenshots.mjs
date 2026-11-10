import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const frontendUrl = process.env.DEMO_FRONTEND_URL || "http://127.0.0.1:3000";
const gatewayUrl = process.env.DEMO_GATEWAY_URL || "http://127.0.0.1:4000";
const apiKey = process.env.DEMO_API_KEY || "development-api-key";
const email = process.env.DEMO_EMAIL || "admin@fleet.test";
const password = process.env.DEMO_PASSWORD || "FleetDemo123!";
const outputDirectory = resolve(import.meta.dirname, "../docs/screenshots");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

async function renderGatewayEvidence(page, { title, request, status, headers, payload, success }) {
  const headerRows = Object.entries(headers)
    .map(([name, value]) => `<div><span>${escapeHtml(name)}</span><code>${escapeHtml(value)}</code></div>`)
    .join("");
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #14213d; background: #f4f7fc; }
    * { box-sizing: border-box; } body { margin: 0; padding: 64px; }
    main { max-width: 1180px; margin: auto; } .eyebrow { color: #0b57d0; font-weight: 800; letter-spacing: .12em; }
    h1 { margin: 10px 0 28px; font-size: 42px; } .card { background: white; border: 1px solid #dce4f1; border-radius: 18px; box-shadow: 0 14px 38px rgba(31, 55, 88, .08); overflow: hidden; }
    .request { display: flex; align-items: center; gap: 14px; padding: 20px 24px; background: #102a56; color: white; font-family: ui-monospace, monospace; font-size: 17px; }
    .method { background: #2d75e8; border-radius: 7px; padding: 7px 10px; font-weight: 900; }
    .result { padding: 24px; display: grid; grid-template-columns: 250px 1fr; gap: 24px; }
    .status { display: inline-flex; border-radius: 999px; padding: 9px 14px; color: white; background: ${success ? "#168a55" : "#d53f4c"}; font-weight: 850; font-size: 18px; }
    .headers { margin-top: 24px; display: grid; gap: 12px; } .headers div { display: grid; gap: 4px; }
    .headers span { color: #65728a; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    code { font-family: ui-monospace, monospace; } pre { margin: 0; padding: 20px; max-height: 610px; overflow: hidden; border-radius: 12px; background: #f7f9fc; border: 1px solid #e2e8f2; font: 14px/1.55 ui-monospace, monospace; white-space: pre-wrap; }
    footer { margin-top: 18px; color: #6a768d; font-size: 13px; }
  </style></head><body><main><div class="eyebrow">FLEET ADMINISTRATION · LIVE API EVIDENCE</div><h1>${escapeHtml(title)}</h1><section class="card"><div class="request"><span class="method">GET</span>${escapeHtml(request)}</div><div class="result"><aside><div class="status">HTTP ${status}</div><div class="headers">${headerRows}</div></aside><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div></section><footer>Generated from the running local API Gateway. Credentials and JWT values are redacted.</footer></main></body></html>`);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const appContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const appPage = await appContext.newPage();
  await appPage.goto(`${frontendUrl}/login`, { waitUntil: "networkidle" });
  await appPage.getByRole("textbox", { name: "Email address" }).fill(email);
  await appPage.getByLabel("Password").fill(password);
  await appPage.getByRole("button", { name: "Sign in to FleetFlow" }).click();
  await appPage.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }).waitFor();

  await appPage.getByRole("link", { name: "Live map", exact: true }).click();
  await appPage.getByRole("heading", { name: "Live map" }).waitFor();
  await appPage.getByText("BE-214-XF", { exact: true }).click();
  await appPage.getByRole("slider", { name: "Nearby search radius" }).press("End");
  await appPage.getByRole("button", { name: "Find nearby vehicles" }).click();
  await appPage.getByText("4 locations").waitFor();
  await appPage.waitForTimeout(2_000);
  await appPage.screenshot({ path: resolve(outputDirectory, "01-map-nearby-vehicles.png"), fullPage: true });

  await appPage.getByRole("link", { name: /Notifications/ }).click();
  await appPage.getByRole("heading", { name: "Notifications" }).waitFor();
  const lowBatteryRow = appPage.getByText(/low battery/i).locator("xpath=ancestor::tr");
  await lowBatteryRow.getByRole("button").first().click();
  await appPage.getByRole("heading", { name: "Delivery attempts" }).waitFor();
  await appPage.waitForTimeout(700);
  await appPage.screenshot({ path: resolve(outputDirectory, "02-sms-notification.png") });
  await appContext.close();

  const rejectedResponse = await fetch(`${gatewayUrl}/api/vehicles`);
  const rejectedPayload = await rejectedResponse.json();
  const rejectedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rejectedPage = await rejectedContext.newPage();
  await renderGatewayEvidence(rejectedPage, {
    title: "API key verification",
    request: `${gatewayUrl}/api/vehicles`,
    status: rejectedResponse.status,
    headers: { "X-API-Key": "missing", "X-Request-Id": rejectedPayload?.error?.requestId || "generated" },
    payload: rejectedPayload,
    success: false
  });
  await rejectedPage.screenshot({ path: resolve(outputDirectory, "03-gateway-api-key-rejected.png"), fullPage: true });
  await rejectedContext.close();

  const loginResponse = await fetch(`${gatewayUrl}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ email, password })
  });
  const loginPayload = await loginResponse.json();
  const token = loginPayload?.data?.token;
  if (!loginResponse.ok || !token) throw new Error("Could not obtain a demonstration JWT.");

  const routedResponse = await fetch(`${gatewayUrl}/api/vehicles`, {
    headers: { "x-api-key": apiKey, authorization: `Bearer ${token}` }
  });
  const routedPayload = await routedResponse.json();
  const routedEvidence = {
    data: (routedPayload?.data || []).map(({ id, registrationNumber, make, model, operationalStatus }) => ({ id, registrationNumber, make, model, operationalStatus })),
    meta: routedPayload?.meta
  };
  const routedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const routedPage = await routedContext.newPage();
  await renderGatewayEvidence(routedPage, {
    title: "Gateway routing success",
    request: `${gatewayUrl}/api/vehicles`,
    status: routedResponse.status,
    headers: {
      "X-API-Key": "present (redacted)",
      Authorization: "Bearer <redacted>",
      "X-Request-Id": routedResponse.headers.get("x-request-id") || "generated",
      RateLimit: routedResponse.headers.get("ratelimit") || "enabled"
    },
    payload: routedEvidence,
    success: true
  });
  await routedPage.screenshot({ path: resolve(outputDirectory, "04-gateway-routing-success.png"), fullPage: true });
  await routedContext.close();

  const docsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const docsPage = await docsContext.newPage();
  await docsPage.goto(`${gatewayUrl}/api-docs`, { waitUntil: "networkidle" });
  await docsPage.screenshot({ path: resolve(outputDirectory, "05-swagger-ui.png") });
  await docsContext.close();

  console.log(`Demonstration screenshots saved to ${outputDirectory}`);
} finally {
  await browser.close();
}
