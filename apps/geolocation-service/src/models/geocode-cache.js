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

export const geocodeCacheSchema = new Schema(
  {
    queryHash: { type: String, required: true },
    normalizedQuery: { type: String, required: true, trim: true, maxlength: 500 },
    displayName: { type: String, required: true, trim: true, maxlength: 1000 },
    location: { type: pointSchema, required: true },
    provider: { type: String, enum: ["mock", "nominatim"], required: true },
    providerPlaceId: { type: String, trim: true },
    cachedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

geocodeCacheSchema.index({ queryHash: 1 }, { unique: true });
geocodeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function createGeocodeCacheModel(connection) {
  return connection.models.GeocodeCache ?? connection.model("GeocodeCache", geocodeCacheSchema);
}
