function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createVehicleRepository({ Vehicle, VehicleStatusHistory }) {
  return Object.freeze({
    create(values) {
      return Vehicle.create(values);
    },

    findById(id) {
      return Vehicle.findById(id).exec();
    },

    async list({ filters, page, pageSize }) {
      const query = {};
      if (filters.status) query.operationalStatus = filters.status;
      if (filters.registrationNumber) query.registrationNumber = filters.registrationNumber;
      if (filters.make) query.make = new RegExp(`^${escapeRegularExpression(filters.make)}$`, "i");
      if (filters.model) query.model = new RegExp(`^${escapeRegularExpression(filters.model)}$`, "i");

      const [vehicles, totalItems] = await Promise.all([
        Vehicle.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .exec(),
        Vehicle.countDocuments(query).exec()
      ]);
      return { vehicles, totalItems };
    },

    updateById(id, changes) {
      return Vehicle.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).exec();
    },

    deleteById(id) {
      return Vehicle.findByIdAndDelete(id).exec();
    },

    createStatusHistory(values) {
      return VehicleStatusHistory.create(values);
    },

    listStatusHistory(vehicleId) {
      return VehicleStatusHistory.find({ vehicleId }).sort({ changedAt: -1, _id: -1 }).exec();
    }
  });
}
