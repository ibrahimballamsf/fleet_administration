export function createTelemetryRepository({ Telemetry, VehicleEvent }) {
  return Object.freeze({
    createTelemetry(values) {
      return Telemetry.create(values);
    },

    async listTelemetry(vehicleId, { page, pageSize }) {
      const query = { vehicleId };
      const [telemetry, totalItems] = await Promise.all([
        Telemetry.find(query)
          .sort({ recordedAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .exec(),
        Telemetry.countDocuments(query).exec()
      ]);
      return { telemetry, totalItems };
    },

    latestTelemetry(vehicleId) {
      return Telemetry.findOne({ vehicleId }).sort({ recordedAt: -1, _id: -1 }).exec();
    },

    createEvent(values) {
      return VehicleEvent.create(values);
    },

    updateEvent(id, changes) {
      return VehicleEvent.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).exec();
    },

    listEvents(vehicleId) {
      return VehicleEvent.find({ vehicleId }).sort({ occurredAt: -1, _id: -1 }).exec();
    }
  });
}
