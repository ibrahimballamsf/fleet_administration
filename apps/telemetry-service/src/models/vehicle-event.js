import mongoose from "mongoose";
import { EVENT_SEVERITIES, EVENT_TYPES } from "./telemetry.js";

const { Schema } = mongoose;

export const vehicleEventSchema = new Schema(
  {
    vehicleId: { type: String, required: true, trim: true },
    telemetryId: { type: Schema.Types.ObjectId, ref: "Telemetry" },
    type: { type: String, enum: EVENT_TYPES.filter((type) => type !== "none"), required: true },
    severity: { type: String, enum: EVENT_SEVERITIES, required: true },
    message: { type: String, trim: true, maxlength: 500 },
    occurredAt: { type: Date, required: true },
    notificationId: { type: String, trim: true },
    processingStatus: {
      type: String,
      enum: ["detected", "notification_requested", "notification_sent", "notification_failed"],
      default: "detected"
    }
  },
  { timestamps: true, optimisticConcurrency: true }
);

vehicleEventSchema.index({ vehicleId: 1, occurredAt: -1 });
vehicleEventSchema.index({ severity: 1, occurredAt: -1 });

export function createVehicleEventModel(connection) {
  return connection.models.VehicleEvent ?? connection.model("VehicleEvent", vehicleEventSchema);
}
