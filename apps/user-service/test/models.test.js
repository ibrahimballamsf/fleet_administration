import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createUserModel } from "../src/models/index.js";

const connection = mongoose.createConnection();
const User = createUserModel(connection);

test.after(async () => connection.close());

test("normalizes user email and applies safe defaults", async () => {
  const user = new User({
    name: "Fleet Administrator",
    email: "ADMIN@EXAMPLE.COM",
    passwordHash: "hashed-password"
  });

  await user.validate();
  assert.equal(user.email, "admin@example.com");
  assert.equal(user.role, "viewer");
  assert.equal(user.notificationPreferences.criticalEvents, true);
});

test("rejects unsupported roles and invalid phone numbers", async () => {
  const user = new User({
    name: "Test User",
    email: "user@example.com",
    passwordHash: "hashed-password",
    role: "superuser",
    phoneNumber: "1234"
  });

  await assert.rejects(user.validate(), (error) => {
    assert.ok(error.errors.role);
    assert.ok(error.errors.phoneNumber);
    return true;
  });
});
