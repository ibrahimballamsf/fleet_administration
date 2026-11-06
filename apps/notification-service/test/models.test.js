import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createNotificationAttemptModel, createNotificationModel } from "../src/models/index.js";

const connection = mongoose.createConnection();
const Notification = createNotificationModel(connection);
const NotificationAttempt = createNotificationAttemptModel(connection);

test.after(async () => connection.close());

test("creates pending notification records by default", async () => {
  const notification = new Notification({
    recipientUserId: "user-1",
    recipientPhoneNumber: "+32470000000",
    vehicleId: "vehicle-1",
    triggerType: "engine_fault",
    message: "Vehicle BE-123-XY reported an engine fault.",
    provider: "stub"
  });

  await notification.validate();
  assert.equal(notification.status, "pending");
  assert.equal(notification.attemptCount, 0);
});

test("rejects invalid recipients and attempt numbers", async () => {
  const notification = new Notification({
    recipientUserId: "user-1",
    recipientPhoneNumber: "0470000000",
    vehicleId: "vehicle-1",
    triggerType: "engine_fault",
    message: "Engine fault",
    provider: "stub"
  });
  await assert.rejects(notification.validate(), (error) => {
    assert.ok(error.errors.recipientPhoneNumber);
    return true;
  });

  const attempt = new NotificationAttempt({
    notificationId: new mongoose.Types.ObjectId(),
    attemptNumber: 0,
    provider: "stub",
    status: "failed",
    requestedAt: new Date(),
    completedAt: new Date()
  });
  await assert.rejects(attempt.validate(), (error) => {
    assert.ok(error.errors.attemptNumber);
    return true;
  });
});
