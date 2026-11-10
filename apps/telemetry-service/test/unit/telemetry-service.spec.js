import { expect } from "chai";
import { createTelemetryService } from "../../src/services/telemetry-service.js";

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error("Expected promise to reject");
}

const recordedAt = new Date("2026-11-08T12:00:00Z");
const reading = {
  vehicleId: "vehicle-1", latitude: 50.85, longitude: 4.35, speedKph: 72,
  batteryPercent: 84, engineCondition: "normal", eventType: "none", recordedAt
};

function makeService(overrides = {}) {
  const calls = { telemetry: [], events: [], eventUpdates: [], locations: [], summaries: [], notifications: [] };
  const repository = {
    createTelemetry: async (input) => { calls.telemetry.push(input); return { _id: "telemetry-1", ...input }; },
    createEvent: async (input) => { calls.events.push(input); return { _id: "event-1", ...input }; },
    updateEvent: async (id, changes) => { calls.eventUpdates.push({ id, changes }); return { _id: id, vehicleId: "vehicle-1", type: "low_battery", severity: "critical", message: "Low battery", occurredAt: recordedAt, ...changes }; },
    listTelemetry: async () => ({ telemetry: [], totalItems: 0 }),
    latestTelemetry: async () => null,
    listEvents: async () => [],
    ...overrides.repository
  };
  const vehicleClient = {
    getVehicle: async () => ({ id: "vehicle-1" }),
    updateTelemetrySummary: async (...args) => { calls.summaries.push(args); return {}; },
    ...overrides.vehicleClient
  };
  const geolocationClient = {
    updateLocation: async (...args) => { calls.locations.push(args); return {}; },
    ...overrides.geolocationClient
  };
  const notificationClient = {
    sendCriticalEvent: async (event) => { calls.notifications.push(event); return { data: { id: "notification-1", status: "sent" } }; },
    ...overrides.notificationClient
  };
  return { service: createTelemetryService({ repository, vehicleClient, geolocationClient, notificationClient }), calls };
}

describe("Telemetry Service unit tests", () => {
  it("persists normal telemetry and synchronizes both downstream summaries", async () => {
    const { service, calls } = makeService();
    const result = await service.submit(reading, { requestId: "req-1" });

    expect(calls.telemetry[0].location.coordinates).to.deep.equal([4.35, 50.85]);
    expect(calls.events).to.have.length(0);
    expect(result.integrations).to.deep.equal({
      geolocation: { status: "synchronized" },
      vehicleSummary: { status: "synchronized" },
      notification: { status: "not_required" }
    });
  });

  it("classifies low battery readings as critical and records notification success", async () => {
    const { service, calls } = makeService();
    const result = await service.submit({ ...reading, batteryPercent: 10 }, { requestId: "req-2" });

    expect(calls.telemetry[0]).to.include({ eventType: "low_battery", severity: "critical" });
    expect(calls.events[0]).to.include({ type: "low_battery", severity: "critical", processingStatus: "detected" });
    expect(calls.notifications[0]).to.include({ type: "low_battery", eventId: "event-1" });
    expect(calls.eventUpdates[0].changes).to.deep.equal({ processingStatus: "notification_sent", notificationId: "notification-1" });
    expect(result.integrations.notification).to.deep.equal({ status: "sent", notificationId: "notification-1" });
  });

  it("retains telemetry and reports independent downstream synchronization failures", async () => {
    const { service, calls } = makeService({
      geolocationClient: { updateLocation: async () => { throw new Error("maps offline"); } },
      vehicleClient: { updateTelemetrySummary: async () => { throw new Error("vehicle offline"); } }
    });
    const result = await service.submit(reading, { requestId: "req-3" });

    expect(calls.telemetry).to.have.length(1);
    expect(result.integrations.geolocation).to.deep.equal({ status: "failed", errorCode: "DOWNSTREAM_UNAVAILABLE" });
    expect(result.integrations.vehicleSummary).to.deep.equal({ status: "failed", errorCode: "DOWNSTREAM_UNAVAILABLE" });
  });

  it("returns a not-found error when no latest reading exists", async () => {
    const { service } = makeService();
    const error = await rejected(service.latest("vehicle-1"));
    expect(error.code).to.equal("NOT_FOUND");
  });
});
