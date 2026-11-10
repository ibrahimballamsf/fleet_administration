import mongoose from "mongoose";

const { Schema } = mongoose;

const pointSchema = new Schema(
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

export const vehicleLocationSchema = new Schema(
  {
    vehicleId: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    source: { type: String, enum: ["telemetry", "geocoded", "manual"], required: true },
    accuracyMeters: { type: Number, min: 0 },
    recordedAt: { type: Date, required: true },
    address: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true, optimisticConcurrency: true }
);

vehicleLocationSchema.index({ vehicleId: 1 }, { unique: true });
vehicleLocationSchema.index({ location: "2dsphere" });
vehicleLocationSchema.index({ recordedAt: -1 });

export function createVehicleLocationModel(connection) {
  return connection.models.VehicleLocation ?? connection.model("VehicleLocation", vehicleLocationSchema);
}
