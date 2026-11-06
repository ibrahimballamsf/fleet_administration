import mongoose from "mongoose";
import { VEHICLE_STATUSES } from "./vehicle.js";

const { Schema } = mongoose;

export const vehicleStatusHistorySchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    fromStatus: { type: String, enum: [...VEHICLE_STATUSES, null], default: null },
    toStatus: { type: String, enum: VEHICLE_STATUSES, required: true },
    changedByUserId: { type: String, required: true, trim: true },
    reason: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, default: Date.now, required: true }
  },
  { timestamps: true }
);

vehicleStatusHistorySchema.index({ vehicleId: 1, changedAt: -1 });

export function createVehicleStatusHistoryModel(connection) {
  return (
    connection.models.VehicleStatusHistory ??
    connection.model("VehicleStatusHistory", vehicleStatusHistorySchema)
  );
}
