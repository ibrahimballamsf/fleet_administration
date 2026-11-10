import { expect, test } from "@playwright/test";

const gatewayUrl = `http://127.0.0.1:${process.env.E2E_GATEWAY_PORT || 4000}`;

async function signIn(page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("admin@fleet.test");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in to FleetFlow" }).click();
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), E2E/ })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.post(`${gatewayUrl}/__test/reset`);
});

test("rejects invalid credentials and signs an administrator into the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("admin@fleet.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to FleetFlow" }).click();
  await expect(page.getByText("Email or password is incorrect")).toBeVisible();

  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in to FleetFlow" }).click();
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), E2E/ })).toBeVisible();
  await expect(page.getByText("Volvo FH16")).toBeVisible();
});

test("submits telemetry and refreshes reading history", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Telemetry" }).click();
  await expect(page.getByRole("heading", { name: "Telemetry simulator", exact: true }).first()).toBeVisible();
  await page.getByRole("spinbutton", { name: "Speed (km/h)" }).fill("88");
  await page.getByRole("spinbutton", { name: "Battery (%)" }).fill("76");
  await page.getByRole("button", { name: "Submit telemetry" }).click();
  await expect(page.getByText("Telemetry stored.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "88 km/h" })).toBeVisible();
});

test("creates a new viewer account from user administration", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Users & roles" }).click();
  await page.getByRole("button", { name: "Create user" }).click();
  await page.getByRole("textbox", { name: /Full name/ }).fill("New Fleet Viewer");
  await page.getByRole("textbox", { name: /Email address/ }).fill("viewer@fleet.test");
  await page.getByLabel(/Temporary password/).fill("temporary123");
  await page.getByRole("button", { name: "Create user" }).last().click();
  await expect(page.getByText("Fleet user created with viewer access.")).toBeVisible();
  await expect(page.getByText("New Fleet Viewer")).toBeVisible();
  await expect(page.getByText("viewer@fleet.test")).toBeVisible();
});

test("changes a dispatcher to viewer access", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Users & roles" }).click();
  await page.getByRole("button", { name: "Change Maya Dispatcher's role" }).click();
  const dialog = page.getByRole("dialog", { name: "Change access role" });
  await dialog.getByRole("combobox", { name: "Access role" }).click();
  await page.getByRole("option", { name: "Viewer" }).click();
  await dialog.getByRole("button", { name: "Update role" }).click();
  await expect(page.getByText("Maya Dispatcher's role was updated.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Maya Dispatcher/ })).toContainText("Viewer");
});

test("retries a failed SMS notification", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: /Notifications/ }).click();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await page.getByRole("button", { name: "Retry delivery" }).click();
  await expect(page.getByRole("heading", { name: "Retry SMS delivery?" })).toBeVisible();
  await page.getByRole("button", { name: "Retry delivery" }).last().click();
  await expect(page.getByText("Retry completed with status: sent.")).toBeVisible();
  await expect(page.getByText("failed", { exact: true })).toHaveCount(0);
});
