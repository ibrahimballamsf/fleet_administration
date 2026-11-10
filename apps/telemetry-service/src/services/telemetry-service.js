import { NotFoundError, createPaginationMeta } from "@fleet/shared/http";
import { classifyTelemetry, defaultEventMessage } from "../domain/classify-event.js";

function serializeTelemetry(document) {
  const value = document?.toObject ? document.toObject() : { ...document };
  const [longitude, latitude] = value.location.coordinates;
  return {
    id: value.id ?? (value._id ? String(value._id) : undefined),
    vehicleId: value.vehicleId,
    latitude,
    longitude,
    speedKph: value.speedKph,
    batteryPercent: value.batteryPercent,
    engineCondition: value.engineCondition,
    odometerKm: value.odometerKm,
    eventType: value.eventType,
    severity: value.severity,
    recordedAt: value.recordedAt,
    receivedAt: value.receivedAt,
    rawPayload: value.rawPayload
  };
}

function serializeEvent(document) {
  const value = document?.toObject ? document.toObject() : { ...document };
  return {
    id: value.id ?? (value._id ? String(value._id) : undefined),
    vehicleId: value.vehicleId,
    telemetryId: value.telemetryId ? String(value.telemetryId) : undefined,
    type: value.type,
    severity: value.severity,
    message: value.message,
    occurredAt: value.occurredAt,
    notificationId: value.notificationId,
    processingStatus: value.processingStatus
  };
}

function integrationStatus(result) {
  return result.status === "fulfilled"
    ? { status: "synchronized" }
    : { status: "failed", errorCode: "DOWNSTREAM_UNAVAILABLE" };
}

export function createTelemetryService({ repository, vehicleClient, geolocationClient, notificationClient }) {
  async function notifyEvent(event, context) {
    try {
      const response = await notificationClient.sendCriticalEvent(
        {
          type: event.type,
          severity: event.severity,
          vehicleId: event.vehicleId,
          telemetryId: event.telemetryId,
          eventId: event.id,
          message: event.message,
          occurredAt: event.occurredAt
        },
        context
      );
      const responseData = response?.data ?? response;
      const notificationId = responseData?.id ?? responseData?.notificationId;
      const deliveryStatus = responseData?.status;
      const processingStatus =
        deliveryStatus === "failed"
          ? "notification_failed"
          : deliveryStatus === "sent"
            ? "notification_sent"
            : "notification_requested";
      const updated = await repository.updateEvent(event.id, {
        processingStatus,
        ...(notificationId ? { notificationId } : {})
      });
      return {
        event: serializeEvent(updated),
        notification: { status: deliveryStatus ?? "requested", notificationId }
      };
    } catch {
      const updated = await repository.updateEvent(event.id, {
        processingStatus: "notification_failed"
      });
      return {
        event: serializeEvent(updated),
        notification: { status: "failed", errorCode: "NOTIFICATION_UNAVAILABLE" }
      };
    }
  }

  return Object.freeze({
    async submit(input, context) {
      await vehicleClient.getVehicle(input.vehicleId, context);
      const classification = classifyTelemetry(input);
      const telemetryDocument = await repository.createTelemetry({
        vehicleId: input.vehicleId,
        location: { type: "Point", coordinates: [input.longitude, input.latitude] },
        speedKph: input.speedKph,
        batteryPercent: input.batteryPercent,
        engineCondition: input.engineCondition,
        odometerKm: input.odometerKm,
        eventType: classification.eventType,
        severity: classification.severity,
        recordedAt: input.recordedAt,
        rawPayload: input.rawPayload
      });
      const telemetry = serializeTelemetry(telemetryDocument);

      const [geolocationResult, vehicleResult] = await Promise.allSettled([
        geolocationClient.updateLocation(
          input.vehicleId,
          {
            latitude: input.latitude,
            longitude: input.longitude,
            recordedAt: input.recordedAt
          },
          context
        ),
        vehicleClient.updateTelemetrySummary(
          input.vehicleId,
          {
            latitude: input.latitude,
            longitude: input.longitude,
            recordedAt: input.recordedAt
          },
          context
        )
      ]);

      let event;
      let notification = { status: "not_required" };
      if (classification.eventType !== "none") {
        const eventDocument = await repository.createEvent({
          vehicleId: input.vehicleId,
          telemetryId: telemetryDocument._id ?? telemetryDocument.id,
          type: classification.eventType,
          severity: classification.severity,
          message: defaultEventMessage(classification.eventType),
          occurredAt: input.recordedAt,
          processingStatus: "detected"
        });
        event = serializeEvent(eventDocument);
        const notified = await notifyEvent(event, context);
        event = notified.event;
        notification = notified.notification;
      }

      return {
        telemetry,
        ...(event ? { event } : {}),
        integrations: {
          geolocation: integrationStatus(geolocationResult),
          vehicleSummary: integrationStatus(vehicleResult),
          notification
        }
      };
    },

    async history(vehicleId, { page, pageSize }) {
      const result = await repository.listTelemetry(vehicleId, { page, pageSize });
      return {
        telemetry: result.telemetry.map(serializeTelemetry),
        meta: createPaginationMeta({ page, pageSize, totalItems: result.totalItems })
      };
    },

    async latest(vehicleId) {
      const telemetry = await repository.latestTelemetry(vehicleId);
      if (!telemetry) throw new NotFoundError("Telemetry not found for this vehicle");
      return serializeTelemetry(telemetry);
    },

    async submitEvent(vehicleId, input, context) {
      await vehicleClient.getVehicle(vehicleId, context);
      const eventDocument = await repository.createEvent({
        vehicleId,
        type: input.type,
        severity: "critical",
        message: input.message ?? defaultEventMessage(input.type),
        occurredAt: input.occurredAt,
        processingStatus: "detected"
      });
      return notifyEvent(serializeEvent(eventDocument), context);
    },

    async events(vehicleId) {
      return (await repository.listEvents(vehicleId)).map(serializeEvent);
    }
  });
}
