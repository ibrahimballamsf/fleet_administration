import { expect } from "chai";
import { createGeolocationService } from "../../apps/geolocation-service/src/services/geolocation-service.js";
import { createNotificationService } from "../../apps/notification-service/src/services/notification-service.js";
import { createTelemetryService } from "../../apps/telemetry-service/src/services/telemetry-service.js";
import { createVehicleService } from "../../apps/vehicle-service/src/services/vehicle-service.js";

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error("Expected promise to reject");
}

function createVehicleRepository() {
  const vehicles = new Map();
  const history = [];
  let sequence = 0;
  return {
    vehicles,
    history,
    async create(input) {
      const vehicle = { id: `vehicle-${++sequence}`, operationalStatus: "operational", ...structuredClone(input) };
      vehicles.set(vehicle.id, vehicle);
      return structuredClone(vehicle);
    },
    async findById(id) { return vehicles.has(id) ? structuredClone(vehicles.get(id)) : null; },
    async updateById(id, changes) {
      if (!vehicles.has(id)) return null;
      const updated = { ...vehicles.get(id), ...structuredClone(changes) };
      vehicles.set(id, updated);
      return structuredClone(updated);
    },
    async createStatusHistory(input) { history.push({ id: `history-${history.length + 1}`, ...structuredClone(input) }); },
    async listStatusHistory(vehicleId) { return history.filter((entry) => entry.vehicleId === vehicleId).map((entry) => structuredClone(entry)); },
    async list() { return { vehicles: [...vehicles.values()].map((vehicle) => structuredClone(vehicle)), totalItems: vehicles.size }; },
    async deleteById(id) { const value = await this.findById(id); vehicles.delete(id); return value; }
  };
}

function createLocationRepository() {
  const locations = new Map();
  return {
    locations,
    async upsertVehicleLocation(input) {
      const current = locations.get(input.vehicleId);
      if (current && current.recordedAt > input.recordedAt) return { location: structuredClone(current), updated: false };
      const value = { id: `location-${input.vehicleId}`, ...structuredClone(input) };
      locations.set(input.vehicleId, value);
      return { location: structuredClone(value), updated: true };
    },
    async findVehicleLocation(vehicleId) { return locations.has(vehicleId) ? structuredClone(locations.get(vehicleId)) : null; },
    async nearby() { return []; },
    async listLocations() { return [...locations.values()].map((item) => structuredClone(item)); },
    async findCachedGeocode() { return null; },
    async cacheGeocode() {}
  };
}

function createTelemetryRepository() {
  const telemetry = [];
  const events = [];
  return {
    telemetry,
    events,
    async createTelemetry(input) {
      const value = { id: `telemetry-${telemetry.length + 1}`, ...structuredClone(input), receivedAt: new Date() };
      telemetry.push(value);
      return structuredClone(value);
    },
    async createEvent(input) {
      const value = { id: `event-${events.length + 1}`, ...structuredClone(input) };
      events.push(value);
      return structuredClone(value);
    },
    async updateEvent(id, changes) {
      const index = events.findIndex((event) => event.id === id);
      events[index] = { ...events[index], ...structuredClone(changes) };
      return structuredClone(events[index]);
    },
    async listTelemetry(vehicleId, { page, pageSize }) {
      const matching = telemetry.filter((item) => item.vehicleId === vehicleId);
      return { telemetry: matching.slice((page - 1) * pageSize, page * pageSize).map((item) => structuredClone(item)), totalItems: matching.length };
    },
    async latestTelemetry(vehicleId) {
      return telemetry.filter((item) => item.vehicleId === vehicleId).sort((a, b) => b.recordedAt - a.recordedAt).map((item) => structuredClone(item))[0] ?? null;
    },
    async listEvents(vehicleId) { return events.filter((event) => event.vehicleId === vehicleId).map((event) => structuredClone(event)); }
  };
}

function createNotificationRepository() {
  const notifications = [];
  const attempts = [];
  return {
    notifications,
    attempts,
    async create(input) {
      const value = { id: `notification-${notifications.length + 1}`, ...structuredClone(input), createdAt: new Date() };
      notifications.push(value);
      return structuredClone(value);
    },
    async updateById(id, changes) {
      const index = notifications.findIndex((item) => item.id === id);
      notifications[index] = { ...notifications[index], ...structuredClone(changes) };
      return structuredClone(notifications[index]);
    },
    async createAttempt(input) { attempts.push({ id: `attempt-${attempts.length + 1}`, ...structuredClone(input) }); },
    async findById(id) { return notifications.find((item) => item.id === id) ?? null; },
    async listAttempts(id) { return attempts.filter((item) => item.notificationId === id).map((item) => structuredClone(item)); },
    async list() { return { notifications: notifications.map((item) => structuredClone(item)), totalItems: notifications.length }; }
  };
}

async function createFixture({ smsFailure = false, notificationUnavailable = false } = {}) {
  const vehicleRepository = createVehicleRepository();
  const locationRepository = createLocationRepository();
  const telemetryRepository = createTelemetryRepository();
  const notificationRepository = createNotificationRepository();
  const smsMessages = [];
  const smsProvider = {
    name: "integration-stub",
    async send(message) {
      smsMessages.push(structuredClone(message));
      if (smsFailure) throw Object.assign(new Error("Stub provider unavailable"), { code: "STUB_UNAVAILABLE" });
      return { providerMessageId: `sms-${smsMessages.length}` };
    }
  };
  const notificationService = createNotificationService({
    repository: notificationRepository,
    smsProvider,
    adminPhoneNumbers: ["+32470000000"]
  });
  const vehicleNotificationClient = {
    async notifyStatusChange(input) {
      if (notificationUnavailable) throw new Error("Notification service unavailable");
      return { data: await notificationService.send({ event: {
        type: "status_change",
        vehicleId: input.vehicle.id,
        registrationNumber: input.vehicle.registrationNumber,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        reason: input.reason,
        changedByUserId: input.changedByUserId
      } }) };
    }
  };
  const vehicleService = createVehicleService({ repository: vehicleRepository, notificationClient: vehicleNotificationClient });
  const geolocationService = createGeolocationService({
    repository: locationRepository,
    geocoder: { geocode: async () => { throw new Error("Not used by service integration fixture"); } },
    cacheTtlSeconds: 3600,
    maxNearbyRadiusKm: 100
  });
  const telemetryService = createTelemetryService({
    repository: telemetryRepository,
    vehicleClient: {
      getVehicle: (id) => vehicleService.getById(id),
      updateTelemetrySummary: (id, summary) => vehicleService.updateTelemetrySummary(id, summary)
    },
    geolocationClient: {
      updateLocation: (id, input) => geolocationService.updateLocation(id, { ...input, source: "telemetry" })
    },
    notificationClient: {
      async sendCriticalEvent(event) {
        if (notificationUnavailable) throw new Error("Notification service unavailable");
        return { data: await notificationService.send({ event }) };
      }
    }
  });
  const vehicle = await vehicleService.create({
    registrationNumber: "BE-214-XF",
    vin: "1HGBH41JXMN109186",
    make: "Volvo",
    model: "FH16",
    operationalStatus: "operational"
  }, { id: "admin-1" });
  return {
    vehicle,
    vehicleService,
    geolocationService,
    telemetryService,
    repositories: { vehicleRepository, locationRepository, telemetryRepository, notificationRepository },
    smsMessages
  };
}

function telemetryInput(vehicleId, overrides = {}) {
  return {
    vehicleId,
    latitude: 50.8503,
    longitude: 4.3517,
    speedKph: 72,
    batteryPercent: 84,
    engineCondition: "normal",
    eventType: "none",
    recordedAt: new Date("2026-11-08T12:00:00Z"),
    ...overrides
  };
}

describe("Fleet service integrations", () => {
  it("synchronizes a telemetry reading into vehicle and geolocation services", async () => {
    const fixture = await createFixture();
    const result = await fixture.telemetryService.submit(telemetryInput(fixture.vehicle.id), { requestId: "req-1" });
    const vehicle = await fixture.vehicleService.getById(fixture.vehicle.id);
    const location = await fixture.geolocationService.getVehicleLocation(fixture.vehicle.id);

    expect(result.integrations.geolocation.status).to.equal("synchronized");
    expect(result.integrations.vehicleSummary.status).to.equal("synchronized");
    expect(vehicle.latestLocation.coordinates).to.deep.equal([4.3517, 50.8503]);
    expect(location).to.include({ latitude: 50.8503, longitude: 4.3517, source: "telemetry" });
  });

  it("turns low-battery telemetry into an event, SMS notification, and delivery audit", async () => {
    const fixture = await createFixture();
    const result = await fixture.telemetryService.submit(telemetryInput(fixture.vehicle.id, { batteryPercent: 10 }), { requestId: "req-2" });

    expect(result.event).to.include({ type: "low_battery", severity: "critical", processingStatus: "notification_sent" });
    expect(result.integrations.notification.status).to.equal("sent");
    expect(fixture.smsMessages).to.have.length(1);
    expect(fixture.repositories.notificationRepository.notifications[0]).to.include({ triggerType: "low_battery", status: "sent" });
    expect(fixture.repositories.notificationRepository.attempts[0]).to.include({ status: "sent", attemptNumber: 1 });
  });

  it("sends and audits an SMS when a vehicle operational status changes", async () => {
    const fixture = await createFixture();
    const result = await fixture.vehicleService.updateStatus(
      fixture.vehicle.id,
      { status: "maintenance", reason: "Scheduled inspection" },
      { id: "dispatcher-1" },
      "req-3"
    );

    expect(result.vehicle.operationalStatus).to.equal("maintenance");
    expect(result.notification.status).to.equal("requested");
    expect(fixture.smsMessages[0].message).to.include("BE-214-XF").and.include("operational to maintenance");
    expect(fixture.repositories.notificationRepository.notifications[0]).to.include({ triggerType: "status_change", status: "sent" });
    expect(fixture.repositories.vehicleRepository.history).to.have.length(2);
  });

  it("prevents stale telemetry from overwriting newer cross-service location state", async () => {
    const fixture = await createFixture();
    await fixture.telemetryService.submit(telemetryInput(fixture.vehicle.id, { latitude: 51, longitude: 5, recordedAt: new Date("2026-11-08T13:00:00Z") }), {});
    await fixture.telemetryService.submit(telemetryInput(fixture.vehicle.id, { latitude: 49, longitude: 3, recordedAt: new Date("2026-11-08T11:00:00Z") }), {});
    const vehicle = await fixture.vehicleService.getById(fixture.vehicle.id);
    const location = await fixture.geolocationService.getVehicleLocation(fixture.vehicle.id);

    expect(vehicle.latestLocation.coordinates).to.deep.equal([5, 51]);
    expect([location.longitude, location.latitude]).to.deep.equal([5, 51]);
  });

  it("retains critical events while recording an SMS provider delivery failure", async () => {
    const fixture = await createFixture({ smsFailure: true });
    const result = await fixture.telemetryService.submit(telemetryInput(fixture.vehicle.id, { engineCondition: "fault" }), {});

    expect(fixture.repositories.telemetryRepository.telemetry).to.have.length(1);
    expect(fixture.repositories.telemetryRepository.events).to.have.length(1);
    expect(result.event.processingStatus).to.equal("notification_failed");
    expect(result.integrations.notification.status).to.equal("failed");
    expect(fixture.repositories.notificationRepository.attempts[0].failureReason).to.equal("STUB_UNAVAILABLE: SMS delivery failed");
  });

  it("rejects telemetry for an unknown vehicle before writing any downstream state", async () => {
    const fixture = await createFixture();
    const error = await rejected(fixture.telemetryService.submit(telemetryInput("missing-vehicle"), {}));

    expect(error.code).to.equal("NOT_FOUND");
    expect(fixture.repositories.telemetryRepository.telemetry).to.have.length(0);
    expect(fixture.repositories.locationRepository.locations.size).to.equal(0);
    expect(fixture.repositories.notificationRepository.notifications).to.have.length(0);
  });
});
