import { expect } from "chai";
import { createNotificationService } from "../../src/services/notification-service.js";

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error("Expected promise to reject");
}

function makeService(overrides = {}) {
  const calls = { created: [], updates: [], attempts: [], sent: [] };
  let sequence = 0;
  const repository = {
    create: async (input) => { const value = { _id: `notification-${++sequence}`, ...input }; calls.created.push(value); return value; },
    updateById: async (id, changes) => { calls.updates.push({ id, changes }); const created = calls.created.find((item) => String(item._id) === String(id)) || {}; return { ...created, _id: id, ...changes }; },
    createAttempt: async (input) => calls.attempts.push(input),
    findById: async () => null,
    listAttempts: async () => [],
    list: async () => ({ notifications: [], totalItems: 0 }),
    ...overrides.repository
  };
  const smsProvider = {
    name: "stub",
    send: async (input) => { calls.sent.push(input); return { providerMessageId: `sms-${calls.sent.length}` }; },
    ...overrides.smsProvider
  };
  return {
    service: createNotificationService({ repository, smsProvider, adminPhoneNumbers: overrides.adminPhoneNumbers || ["+32470000000", "+32471111111"] }),
    calls
  };
}

describe("Notification Service unit tests", () => {
  it("creates, delivers, and audits a direct SMS notification", async () => {
    const { service, calls } = makeService();
    const result = await service.send({ recipientUserId: "admin-1", recipientPhoneNumber: "+32470000000", vehicleId: "vehicle-1", triggerType: "status_change", message: "Vehicle changed status" });

    expect(calls.created[0]).to.include({ provider: "stub", status: "pending", attemptCount: 0 });
    expect(calls.sent[0]).to.deep.equal({ to: "+32470000000", message: "Vehicle changed status" });
    expect(calls.updates[0].changes).to.include({ status: "sent", providerMessageId: "sms-1", attemptCount: 1 });
    expect(calls.attempts[0]).to.include({ status: "sent", attemptNumber: 1 });
    expect(result.summary).to.deep.equal({ total: 1, sent: 1, failed: 0 });
  });

  it("records a safe failure and delivery attempt when the SMS provider rejects", async () => {
    const providerError = Object.assign(new Error("Private provider diagnostic"), { code: "TWILIO_DOWN" });
    const { service, calls } = makeService({ smsProvider: { send: async () => { throw providerError; } } });
    const result = await service.send({ recipientUserId: "admin-1", recipientPhoneNumber: "+32470000000", triggerType: "low_battery", message: "Low battery" });

    expect(calls.updates[0].changes).to.include({ status: "failed", failureReason: "TWILIO_DOWN: SMS delivery failed", attemptCount: 1 });
    expect(calls.attempts[0]).to.include({ status: "failed", failureReason: "TWILIO_DOWN: SMS delivery failed" });
    expect(result.status).to.equal("failed");
  });

  it("fans critical events out to every configured administrator", async () => {
    const { service, calls } = makeService();
    const result = await service.send({ event: { type: "engine_fault", vehicleId: "vehicle-1", eventId: "event-1", message: "Engine fault" } });

    expect(calls.sent.map((item) => item.to)).to.deep.equal(["+32470000000", "+32471111111"]);
    expect(calls.created.map((item) => item.recipientUserId)).to.deep.equal(["configured-admin-1", "configured-admin-2"]);
    expect(result.summary).to.deep.equal({ total: 2, sent: 2, failed: 0 });
  });

  it("allows retries only for failed notification records", async () => {
    const { service } = makeService({ repository: { findById: async () => ({ _id: "notification-1", status: "sent", attemptCount: 1 }) } });
    const error = await rejected(service.retry("notification-1"));
    expect(error.code).to.equal("CONFLICT");
  });
});
