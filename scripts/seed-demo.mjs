/**
 *  This script seeds the demo data for the Fleet Administration system.
 *  It populates the MongoDB databases with initial users, vehicles, telemetry,
 *  geolocation, and notification data for demonstration purposes.
 */
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { createUserModel } from "../apps/user-service/src/models/index.js";
import { createVehicleModel, createVehicleStatusHistoryModel } from "../apps/vehicle-service/src/models/index.js";
import { createVehicleLocationModel } from "../apps/geolocation-service/src/models/index.js";
import { createTelemetryModel, createVehicleEventModel } from "../apps/telemetry-service/src/models/index.js";
import { createNotificationAttemptModel, createNotificationModel } from "../apps/notification-service/src/models/index.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const password = process.env.DEMO_PASSWORD || "FleetDemo123!";
const databaseNames = {
  users: process.env.USER_DB_NAME || "fleet_users",
  vehicles: process.env.VEHICLE_DB_NAME || "fleet_vehicles",
  telemetry: process.env.TELEMETRY_DB_NAME || "fleet_telemetry",
  geolocation: process.env.GEOLOCATION_DB_NAME || "fleet_geolocation",
  notifications: process.env.NOTIFICATION_DB_NAME || "fleet_notifications"
};

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Demo seeding is disabled in production. Set ALLOW_DEMO_SEED=true only for an intentional demonstration environment.");
}

const objectId = (value) => new mongoose.Types.ObjectId(value);
const ids = {
  users: ["650000000000000000000001", "650000000000000000000002", "650000000000000000000003"].map(objectId),
  vehicles: ["660000000000000000000001", "660000000000000000000002", "660000000000000000000003", "660000000000000000000004", "660000000000000000000005"].map(objectId),
  telemetry: Array.from({ length: 10 }, (_, index) => objectId(`6700000000000000000000${String(index + 1).padStart(2, "0")}`)),
  events: ["680000000000000000000001", "680000000000000000000002", "680000000000000000000003"].map(objectId),
  notifications: ["690000000000000000000001", "690000000000000000000002", "690000000000000000000003", "690000000000000000000004"].map(objectId),
  attempts: ["6a0000000000000000000001", "6a0000000000000000000002", "6a0000000000000000000003", "6a0000000000000000000004"].map(objectId)
};

const now = new Date();
const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60_000);
const locations = [
  { longitude: 4.3517, latitude: 50.8503, city: "Brussels", address: "Brussels Central, Belgium" },
  { longitude: 4.4025, latitude: 51.2194, city: "Antwerp", address: "Antwerp Central, Belgium" },
  { longitude: 3.7174, latitude: 51.0543, city: "Ghent", address: "Ghent, Belgium" },
  { longitude: 4.7005, latitude: 50.8798, city: "Leuven", address: "Leuven, Belgium" },
  { longitude: 5.5797, latitude: 50.6326, city: "Liège", address: "Liège, Belgium" }
];

async function upsertMany(Model, documents) {
  await Model.bulkWrite(documents.map((document) => {
    const { _id, ...values } = document;
    return {
      updateOne: {
        filter: { _id },
        update: { $set: values, $setOnInsert: { _id } },
        upsert: true
      }
    };
  }), { ordered: false });
}

async function connect(name) {
  return mongoose.createConnection(uri, { dbName: name, serverSelectionTimeoutMS: 10_000 }).asPromise();
}

const connections = [];
try {
  const [userConnection, vehicleConnection, telemetryConnection, geolocationConnection, notificationConnection] = await Promise.all([
    connect(databaseNames.users),
    connect(databaseNames.vehicles),
    connect(databaseNames.telemetry),
    connect(databaseNames.geolocation),
    connect(databaseNames.notifications)
  ]);
  connections.push(userConnection, vehicleConnection, telemetryConnection, geolocationConnection, notificationConnection);

  const User = createUserModel(userConnection);
  const Vehicle = createVehicleModel(vehicleConnection);
  const VehicleStatusHistory = createVehicleStatusHistoryModel(vehicleConnection);
  const Telemetry = createTelemetryModel(telemetryConnection);
  const VehicleEvent = createVehicleEventModel(telemetryConnection);
  const VehicleLocation = createVehicleLocationModel(geolocationConnection);
  const Notification = createNotificationModel(notificationConnection);
  const NotificationAttempt = createNotificationAttemptModel(notificationConnection);
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10));

  await upsertMany(User, [
    { _id: ids.users[0], name: "Demo Administrator", email: "admin@fleet.test", phoneNumber: "+32470000000", passwordHash, role: "admin", isActive: true, notificationPreferences: { criticalEvents: true, statusChanges: true }, createdAt: minutesAgo(60 * 24 * 60), updatedAt: now },
    { _id: ids.users[1], name: "Maya Dispatcher", email: "dispatcher@fleet.test", phoneNumber: "+32471111111", passwordHash, role: "dispatcher", isActive: true, notificationPreferences: { criticalEvents: true, statusChanges: true }, createdAt: minutesAgo(60 * 24 * 40), updatedAt: now },
    { _id: ids.users[2], name: "Noah Viewer", email: "viewer@fleet.test", phoneNumber: "+32472222222", passwordHash, role: "viewer", isActive: true, notificationPreferences: { criticalEvents: false, statusChanges: true }, createdAt: minutesAgo(60 * 24 * 20), updatedAt: now }
  ]);

  const vehicleDefinitions = [
    ["BE-214-XF", "1HGBH41JXMN109186", "Volvo", "FH16", 2024, "operational", ids.users[1]],
    ["BE-502-KL", "2HGFC2F59NH000001", "Mercedes-Benz", "Actros", 2023, "maintenance", ids.users[1]],
    ["BE-731-QM", "3C6UR5FL1NG000001", "DAF", "XF", 2022, "operational", ids.users[1]],
    ["BE-118-RT", "4V4NC9EH5NN000001", "Scania", "R450", 2021, "out_of_service", null],
    ["BE-905-VP", "JH4KA8260MC000001", "Renault", "T High", 2024, "emergency", ids.users[1]]
  ];
  const vehicles = vehicleDefinitions.map(([registrationNumber, vin, make, model, year, operationalStatus, assignedUserId], index) => ({
    _id: ids.vehicles[index], registrationNumber, vin, make, model, year, operationalStatus,
    ...(assignedUserId ? { assignedUserId: String(assignedUserId) } : {}),
    address: { city: locations[index].city, country: "Belgium" },
    latestLocation: { type: "Point", coordinates: [locations[index].longitude, locations[index].latitude], updatedAt: minutesAgo(5 + index * 8) },
    lastTelemetryAt: minutesAgo(5 + index * 8),
    createdAt: minutesAgo(60 * 24 * (30 - index * 3)),
    updatedAt: now
  }));
  await upsertMany(Vehicle, vehicles);

  const statusHistory = vehicles.flatMap((vehicle, index) => {
    const initial = { _id: objectId(`6b00000000000000000000${String(index + 1).padStart(2, "0")}`), vehicleId: vehicle._id, fromStatus: null, toStatus: "operational", changedByUserId: String(ids.users[0]), reason: "Vehicle registered", changedAt: vehicle.createdAt, createdAt: vehicle.createdAt, updatedAt: vehicle.createdAt };
    if (vehicle.operationalStatus === "operational") return [initial];
    return [initial, { _id: objectId(`6c00000000000000000000${String(index + 1).padStart(2, "0")}`), vehicleId: vehicle._id, fromStatus: "operational", toStatus: vehicle.operationalStatus, changedByUserId: String(ids.users[1]), reason: index === 1 ? "Scheduled inspection" : index === 3 ? "Awaiting replacement part" : "Emergency diagnostic required", changedAt: minutesAgo(90 + index * 20), createdAt: minutesAgo(90 + index * 20), updatedAt: minutesAgo(90 + index * 20) }];
  });
  await upsertMany(VehicleStatusHistory, statusHistory);

  await upsertMany(VehicleLocation, vehicles.map((vehicle, index) => ({
    _id: objectId(`6d00000000000000000000${String(index + 1).padStart(2, "0")}`),
    vehicleId: String(vehicle._id),
    location: { type: "Point", coordinates: vehicle.latestLocation.coordinates },
    source: "telemetry",
    accuracyMeters: 8 + index * 3,
    recordedAt: vehicle.lastTelemetryAt,
    address: locations[index].address,
    createdAt: vehicle.createdAt,
    updatedAt: now
  })));

  const telemetry = vehicles.flatMap((vehicle, vehicleIndex) => [0, 1].map((offset) => {
    const index = vehicleIndex * 2 + offset;
    const battery = [84, 68, 73, 54, 12][vehicleIndex] + offset;
    const eventType = vehicleIndex === 4 && offset === 0 ? "low_battery" : vehicleIndex === 3 && offset === 0 ? "engine_fault" : "none";
    return {
      _id: ids.telemetry[index], vehicleId: String(vehicle._id),
      location: { type: "Point", coordinates: [locations[vehicleIndex].longitude + offset * .002, locations[vehicleIndex].latitude + offset * .002] },
      speedKph: [72, 0, 64, 0, 18][vehicleIndex] + offset * 3,
      batteryPercent: battery,
      engineCondition: eventType === "engine_fault" ? "fault" : vehicle.operationalStatus === "maintenance" ? "warning" : "normal",
      odometerKm: 80_000 + vehicleIndex * 22_500 + offset * 35,
      eventType,
      severity: eventType === "none" ? "information" : "critical",
      recordedAt: minutesAgo(5 + vehicleIndex * 8 + offset * 60),
      receivedAt: minutesAgo(5 + vehicleIndex * 8 + offset * 60),
      createdAt: minutesAgo(5 + vehicleIndex * 8 + offset * 60),
      updatedAt: minutesAgo(5 + vehicleIndex * 8 + offset * 60)
    };
  }));
  await upsertMany(Telemetry, telemetry);

  const events = [
    { _id: ids.events[0], vehicleId: String(ids.vehicles[3]), telemetryId: ids.telemetry[6], type: "engine_fault", severity: "critical", message: "Engine diagnostic fault detected.", occurredAt: telemetry[6].recordedAt, notificationId: String(ids.notifications[0]), processingStatus: "notification_sent" },
    { _id: ids.events[1], vehicleId: String(ids.vehicles[4]), telemetryId: ids.telemetry[8], type: "low_battery", severity: "critical", message: "Battery charge dropped below the critical threshold.", occurredAt: telemetry[8].recordedAt, notificationId: String(ids.notifications[1]), processingStatus: "notification_failed" },
    { _id: ids.events[2], vehicleId: String(ids.vehicles[4]), type: "emergency_stop", severity: "critical", message: "Driver activated the emergency stop.", occurredAt: minutesAgo(35), notificationId: String(ids.notifications[2]), processingStatus: "notification_sent" }
  ].map((event) => ({ ...event, createdAt: event.occurredAt, updatedAt: event.occurredAt }));
  await upsertMany(VehicleEvent, events);

  const notificationDefinitions = [
    [ids.notifications[0], ids.vehicles[3], "engine_fault", ids.events[0], "Vehicle BE-118-RT reported an engine fault.", "sent", null, minutesAgo(29)],
    [ids.notifications[1], ids.vehicles[4], "low_battery", ids.events[1], "Vehicle BE-905-VP reported a critically low battery.", "failed", "STUB_FAILURE: Demonstration delivery failure", minutesAgo(21)],
    [ids.notifications[2], ids.vehicles[4], "emergency_stop", ids.events[2], "Vehicle BE-905-VP: Driver activated the emergency stop.", "sent", null, minutesAgo(35)],
    [ids.notifications[3], ids.vehicles[1], "status_change", null, "Vehicle BE-502-KL status changed from operational to maintenance: Scheduled inspection", "sent", null, minutesAgo(130)]
  ];
  const notifications = notificationDefinitions.map(([id, vehicleId, triggerType, referenceId, message, status, failureReason, createdAt], index) => ({
    _id: id, recipientUserId: String(ids.users[0]), recipientPhoneNumber: "+32470000000", vehicleId: String(vehicleId), triggerType,
    ...(referenceId ? { triggerReferenceId: String(referenceId) } : {}),
    message, provider: "stub", status, providerMessageId: status === "sent" ? `stub-demo-${index + 1}` : null,
    ...(failureReason ? { failureReason } : {}),
    ...(status === "sent" ? { sentAt: createdAt } : {}),
    attemptCount: 1, createdAt, updatedAt: createdAt
  }));
  await upsertMany(Notification, notifications);
  await upsertMany(NotificationAttempt, notifications.map((notification, index) => ({
    _id: ids.attempts[index], notificationId: notification._id, attemptNumber: 1, provider: "stub", status: notification.status,
    ...(notification.providerMessageId ? { providerMessageId: notification.providerMessageId } : {}),
    ...(notification.failureReason ? { failureReason: notification.failureReason } : {}),
    requestedAt: notification.createdAt, completedAt: notification.createdAt, createdAt: notification.createdAt, updatedAt: notification.createdAt
  })));

  await Promise.all([User, Vehicle, VehicleStatusHistory, VehicleLocation, Telemetry, VehicleEvent, Notification, NotificationAttempt].map((Model) => Model.createIndexes()));
  console.log("Demo data seeded", {
    users: 3,
    vehicles: vehicles.length,
    locations: vehicles.length,
    telemetry: telemetry.length,
    events: events.length,
    notifications: notifications.length,
    login: "admin@fleet.test"
  });
} finally {
  await Promise.all(connections.map((connection) => connection.close()));
}
