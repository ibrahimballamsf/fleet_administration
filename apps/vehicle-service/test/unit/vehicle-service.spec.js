import { expect } from "chai";
import { createVehicleService } from "../../src/services/vehicle-service.js";

function makeService(overrides = {}) {
  const calls = { created: [], histories: [], updates: [], notifications: [] };
  const repository = {
    create: async (input) => { calls.created.push(input); return { _id: "vehicle-1", operationalStatus: "operational", ...input }; },
    createStatusHistory: async (input) => calls.histories.push(input),
    findById: async () => ({ _id: "vehicle-1", registrationNumber: "BE-001", operationalStatus: "operational" }),
    updateById: async (id, changes) => { calls.updates.push({ id, changes }); return { _id: id, registrationNumber: "BE-001", operationalStatus: changes.operationalStatus ?? "operational", ...changes }; },
    list: async () => ({ vehicles: [], totalItems: 0 }),
    listStatusHistory: async () => [],
    deleteById: async () => ({ id: "vehicle-1" }),
    ...overrides.repository
  };
  const notificationClient = {
    notifyStatusChange: async (input) => { calls.notifications.push(input); return { data: { id: "notification-1" } }; },
    ...overrides.notificationClient
  };
  return { service: createVehicleService({ repository, notificationClient }), calls };
}

describe("Vehicle Service unit tests", () => {
  it("converts input coordinates to GeoJSON order and writes initial status history", async () => {
    const { service, calls } = makeService();
    const vehicle = await service.create({
      registrationNumber: "BE-001",
      operationalStatus: "operational",
      location: { latitude: 50.85, longitude: 4.35, recordedAt: new Date("2026-11-01") }
    }, { id: "admin-1" });

    expect(calls.created[0].latestLocation.coordinates).to.deep.equal([4.35, 50.85]);
    expect(calls.created[0]).not.to.have.property("location");
    expect(calls.histories[0]).to.include({ fromStatus: null, toStatus: "operational", changedByUserId: "admin-1" });
    expect(vehicle.id).to.equal("vehicle-1");
  });

  it("does not write history or notify when operational status is unchanged", async () => {
    const { service, calls } = makeService();
    const result = await service.updateStatus("vehicle-1", { status: "operational", reason: "No change" }, { id: "admin-1" }, "req-1");

    expect(result.notification.status).to.equal("not_required");
    expect(calls.updates).to.have.length(0);
    expect(calls.histories).to.have.length(0);
    expect(calls.notifications).to.have.length(0);
  });

  it("keeps a valid status change when notification delivery is unavailable", async () => {
    const { service, calls } = makeService({ notificationClient: { notifyStatusChange: async () => { throw new Error("offline"); } } });
    const result = await service.updateStatus("vehicle-1", { status: "maintenance", reason: "Scheduled service" }, { id: "dispatcher-1" }, "req-2");

    expect(calls.updates[0].changes).to.deep.equal({ operationalStatus: "maintenance" });
    expect(calls.histories[0]).to.include({ fromStatus: "operational", toStatus: "maintenance", reason: "Scheduled service" });
    expect(result.notification).to.deep.equal({ status: "failed", errorCode: "NOTIFICATION_UNAVAILABLE" });
  });

  it("ignores stale telemetry summaries without overwriting the current location", async () => {
    const newer = new Date("2026-11-08T12:00:00Z");
    const { service, calls } = makeService({ repository: { findById: async () => ({ _id: "vehicle-1", lastTelemetryAt: newer, operationalStatus: "operational" }) } });
    const result = await service.updateTelemetrySummary("vehicle-1", { recordedAt: new Date("2026-11-08T11:00:00Z"), latitude: 1, longitude: 2 });

    expect(result.updated).to.equal(false);
    expect(calls.updates).to.have.length(0);
  });
});
