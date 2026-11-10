import mongoose from "mongoose";

const { Schema } = mongoose;

export const EVENT_TYPES = Object.freeze([
  "none",
  "engine_fault",
  "low_battery",
  "emergency_stop"
]);
export const EVENT_SEVERITIES = Object.freeze(["information", "warning", "critical"]);

const locationSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: ([longitude, latitude] = []) =>
          Number.isFinite(longitude) &&
          longitude >= -180 &&
          longitude <= 180 &&
          Number.isFinite(latitude) &&
          latitude >= -90 &&
          latitude <= 90,
        message: "Coordinates must be [longitude, latitude] within valid ranges."
      }
    }
  },
  { _id: false }
);

export const telemetrySchema = new Schema(
  {
    vehicleId: { type: String, required: true, trim: true },
    location: { type: locationSchema, required: true },
    speedKph: { type: Number, min: 0 },
    batteryPercent: { type: Number, min: 0, max: 100 },
    engineCondition: {
      type: String,
      enum: ["normal", "warning", "fault", "off"],
      default: "normal"
    },
    odometerKm: { type: Number, min: 0 },
    eventType: { type: String, enum: EVENT_TYPES, default: "none" },
    severity: { type: String, enum: EVENT_SEVERITIES, default: "information" },
    recordedAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now, required: true },
    rawPayload: Schema.Types.Mixed
  },
  { timestamps: true }
);

telemetrySchema.index({ vehicleId: 1, recordedAt: -1 });
telemetrySchema.index({ eventType: 1, severity: 1, recordedAt: -1 });

export function createTelemetryModel(connection) {
  return connection.models.Telemetry ?? connection.model("Telemetry", telemetrySchema);
}
