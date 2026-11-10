import { ConflictError, NotFoundError, createPaginationMeta } from "@fleet/shared/http";

function serialize(document) {
  const value = document?.toObject ? document.toObject() : { ...document };
  if (value._id && !value.id) value.id = String(value._id);
  delete value._id;
  delete value.__v;
  return value;
}

function persistenceError(error) {
  if (error?.code !== 11000) return error;
  const field = Object.keys(error.keyPattern ?? {})[0];
  const label = field === "vin" ? "VIN" : "registration number";
  return new ConflictError(`A vehicle with this ${label} already exists`, { cause: error });
}

function toPersistenceInput(input) {
  const { location, ...vehicle } = input;
  if (location) {
    vehicle.latestLocation = {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
      updatedAt: location.recordedAt
    };
  }
  return vehicle;
}

export function createVehicleService({ repository, notificationClient }) {
  return Object.freeze({
    async create(input, actor) {
      try {
        const vehicle = await repository.create(toPersistenceInput(input));
        await repository.createStatusHistory({
          vehicleId: vehicle._id ?? vehicle.id,
          fromStatus: null,
          toStatus: vehicle.operationalStatus,
          changedByUserId: actor.id,
          reason: "Vehicle registered"
        });
        return serialize(vehicle);
      } catch (error) {
        throw persistenceError(error);
      }
    },

    async getById(id) {
      const vehicle = await repository.findById(id);
      if (!vehicle) throw new NotFoundError("Vehicle not found");
      return serialize(vehicle);
    },

    async list({ page, pageSize, ...filters }) {
      const result = await repository.list({ filters, page, pageSize });
      return {
        vehicles: result.vehicles.map(serialize),
        meta: createPaginationMeta({ page, pageSize, totalItems: result.totalItems })
      };
    },

    async update(id, changes) {
      try {
        const vehicle = await repository.updateById(id, changes);
        if (!vehicle) throw new NotFoundError("Vehicle not found");
        return serialize(vehicle);
      } catch (error) {
        throw persistenceError(error);
      }
    },

    async updateStatus(id, { status, reason }, actor, requestId) {
      const current = await repository.findById(id);
      if (!current) throw new NotFoundError("Vehicle not found");

      const previousStatus = current.operationalStatus;
      if (previousStatus === status) {
        return { vehicle: serialize(current), notification: { status: "not_required" } };
      }

      const updated = await repository.updateById(id, { operationalStatus: status });
      await repository.createStatusHistory({
        vehicleId: current._id ?? current.id,
        fromStatus: previousStatus,
        toStatus: status,
        changedByUserId: actor.id,
        reason
      });

      const vehicle = serialize(updated);
      let notification;
      try {
        const result = await notificationClient.notifyStatusChange({
          vehicle,
          previousStatus,
          newStatus: status,
          reason,
          changedByUserId: actor.id,
          requestId
        });
        notification = { status: "requested", data: result.data ?? result };
      } catch {
        notification = { status: "failed", errorCode: "NOTIFICATION_UNAVAILABLE" };
      }

      return { vehicle, notification };
    },

    async updateTelemetrySummary(id, { recordedAt, latitude, longitude }) {
      const current = await repository.findById(id);
      if (!current) throw new NotFoundError("Vehicle not found");
      if (current.lastTelemetryAt && current.lastTelemetryAt > recordedAt) {
        return { vehicle: serialize(current), updated: false };
      }
      const vehicle = await repository.updateById(id, {
        lastTelemetryAt: recordedAt,
        latestLocation: {
          type: "Point",
          coordinates: [longitude, latitude],
          updatedAt: recordedAt
        }
      });
      return { vehicle: serialize(vehicle), updated: true };
    },

    async statusHistory(id) {
      const vehicle = await repository.findById(id);
      if (!vehicle) throw new NotFoundError("Vehicle not found");
      return (await repository.listStatusHistory(id)).map(serialize);
    },

    async remove(id) {
      const vehicle = await repository.deleteById(id);
      if (!vehicle) throw new NotFoundError("Vehicle not found");
    }
  });
}
