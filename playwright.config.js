import { defineConfig } from "@playwright/test";

const frontendPort = process.env.E2E_FRONTEND_PORT || "3000";
const gatewayPort = process.env.E2E_GATEWAY_PORT || "4000";
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;

export default defineConfig({
  testDir: "./test/end-to-end",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "node test/end-to-end/mock-gateway.mjs",
      url: `${gatewayUrl}/health`,
      env: { ...process.env, E2E_FRONTEND_URL: frontendUrl, E2E_GATEWAY_PORT: gatewayPort },
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: `npm run dev --workspace=@fleet/frontend -- --host 127.0.0.1 --port ${frontendPort}`,
      url: `${frontendUrl}/login`,
      env: { ...process.env, VITE_API_BASE_URL: gatewayUrl },
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});
