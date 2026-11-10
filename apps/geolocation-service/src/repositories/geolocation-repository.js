export function createGeolocationRepository({ VehicleLocation, GeocodeCache }) {
  return Object.freeze({
    findCachedGeocode(queryHash, now = new Date()) {
      return GeocodeCache.findOne({ queryHash, expiresAt: { $gt: now } }).exec();
    },

    cacheGeocode(values) {
      return GeocodeCache.findOneAndUpdate(
        { queryHash: values.queryHash },
        { $set: values },
        { upsert: true, new: true, runValidators: true }
      ).exec();
    },

    findVehicleLocation(vehicleId) {
      return VehicleLocation.findOne({ vehicleId }).exec();
    },

    async upsertVehicleLocation(values) {
      const existing = await VehicleLocation.findOne({ vehicleId: values.vehicleId }).exec();
      if (existing && existing.recordedAt > values.recordedAt) {
        return { location: existing, updated: false };
      }

      const location = await VehicleLocation.findOneAndUpdate(
        { vehicleId: values.vehicleId },
        { $set: values },
        { upsert: true, new: true, runValidators: true }
      ).exec();
      return { location, updated: true };
    },

    nearby({ latitude, longitude, radiusKm, limit, excludeVehicleId }) {
      const query = excludeVehicleId ? { vehicleId: { $ne: excludeVehicleId } } : {};
      return VehicleLocation.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distanceMeters",
            maxDistance: radiusKm * 1000,
            spherical: true,
            query
          }
        },
        { $limit: limit }
      ]).exec();
    },

    listLocations(limit) {
      return VehicleLocation.find().sort({ recordedAt: -1, _id: -1 }).limit(limit).exec();
    }
  });
}
