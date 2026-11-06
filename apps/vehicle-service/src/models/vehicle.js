import mongoose from "mongoose";

const { Schema } = mongoose;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const MAX_VEHICLE_YEAR = new Date().getUTCFullYear() + 1;

export const VEHICLE_STATUSES = Object.freeze([
  "operational",
  "maintenance",
  "out_of_service",
  "emergency",
  "inactive"
]);

const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
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
    },
    updatedAt: { type: Date, required: true }
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    line1: { type: String, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 120 },
    region: { type: String, trim: true, maxlength: 120 },
    postalCode: { type: String, trim: true, maxlength: 32 },
    country: { type: String, trim: true, maxlength: 120 }
  },
  { _id: false }
);

export const vehicleSchema = new Schema(
  {
    registrationNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
    vin: { type: String, trim: true, uppercase: true, match: VIN_PATTERN },
    make: { type: String, required: true, trim: true, maxlength: 80 },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    year: {
      type: Number,
      min: 1886,
      max: MAX_VEHICLE_YEAR
    },
    address: addressSchema,
    operationalStatus: { type: String, enum: VEHICLE_STATUSES, default: "operational", index: true },
    assignedUserId: { type: String, trim: true, index: true },
    latestLocation: pointSchema,
    lastTelemetryAt: Date
  },
  { timestamps: true, optimisticConcurrency: true }
);

vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ vin: 1 }, { unique: true, sparse: true });
vehicleSchema.index({ operationalStatus: 1, updatedAt: -1 });

export function createVehicleModel(connection) {
  return connection.models.Vehicle ?? connection.model("Vehicle", vehicleSchema);
}
