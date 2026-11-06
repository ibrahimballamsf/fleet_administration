import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import {
  commaSeparatedSchema,
  findEnvironmentFile,
  loadConfiguration,
  portSchema,
  urlSchema
} from "../src/config/index.js";

const testSchema = z.object({
  PORT: portSchema,
  TARGET_URL: urlSchema,
  API_KEYS: commaSeparatedSchema
});

test("finds a repository environment file from a nested workspace", (context) => {
  const root = mkdtempSync(join(tmpdir(), "fleet-config-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const nestedWorkspace = join(root, "apps", "user-service");
  mkdirSync(nestedWorkspace, { recursive: true });
  writeFileSync(join(root, ".env"), "NODE_ENV=test\n");

  assert.equal(findEnvironmentFile(nestedWorkspace), join(root, ".env"));
});

test("loads and normalizes valid configuration", () => {
  const config = loadConfiguration({
    serviceName: "configuration-test",
    schema: testSchema,
    loadDotenv: false,
    environment: {
      NODE_ENV: "test",
      PORT: "4000",
      TARGET_URL: "http://localhost:4001",
      API_KEYS: "first-key, second-key"
    }
  });

  assert.equal(config.PORT, 4000);
  assert.deepEqual(config.API_KEYS, ["first-key", "second-key"]);
  assert.equal(config.LOG_LEVEL, "info");
  assert.equal(Object.isFrozen(config), true);
});

test("reports invalid variable names without reporting their values", () => {
  const secretValue = "do-not-include-this-value";

  assert.throws(
    () =>
      loadConfiguration({
        serviceName: "configuration-test",
        schema: testSchema,
        loadDotenv: false,
        environment: {
          PORT: "70000",
          TARGET_URL: "not-a-url",
          API_KEYS: secretValue
        }
      }),
    (error) => {
      assert.match(error.message, /PORT/);
      assert.match(error.message, /TARGET_URL/);
      assert.doesNotMatch(error.message, new RegExp(secretValue));
      return true;
    }
  );
});
