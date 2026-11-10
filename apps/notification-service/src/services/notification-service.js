import { ConflictError, NotFoundError, createPaginationMeta } from "@fleet/shared/http";
import { buildEventMessage } from "../domain/message-builder.js";

function serialize(document) {
  const value = document?.toObject ? document.toObject() : { ...document };
  if (value._id && !value.id) value.id = String(value._id);
  delete value._id;
  delete value.__v;
  if (value.notificationId) value.notificationId = String(value.notificationId);
  return value;
}

function safeFailure(error) {
  const providerFailure = error?.name === "SmsProviderError";
  return {
    code: error?.code ?? "SMS_DELIVERY_FAILED",
    message: providerFailure ? error.message.slice(0, 1000) : "SMS delivery failed"
  };
}

export function createNotificationService({ repository, smsProvider, adminPhoneNumbers }) {
  async function deliver(notificationDocument) {
    const notification = serialize(notificationDocument);
    const attemptNumber = (notification.attemptCount ?? 0) + 1;
    const requestedAt = new Date();

    try {
      const result = await smsProvider.send({
        to: notification.recipientPhoneNumber,
        message: notification.message
      });
      const completedAt = new Date();
      const updated = await repository.updateById(notification.id, {
        status: "sent",
        providerMessageId: result.providerMessageId,
        failureReason: null,
        sentAt: completedAt,
        attemptCount: attemptNumber
      });
      await repository.createAttempt({
        notificationId: notification.id,
        attemptNumber,
        provider: notification.provider,
        status: "sent",
        providerMessageId: result.providerMessageId,
        requestedAt,
        completedAt
      });
      return serialize(updated);
    } catch (error) {
      const failure = safeFailure(error);
      const completedAt = new Date();
      const updated = await repository.updateById(notification.id, {
        status: "failed",
        providerMessageId: null,
        failureReason: `${failure.code}: ${failure.message}`,
        attemptCount: attemptNumber
      });
      await repository.createAttempt({
        notificationId: notification.id,
        attemptNumber,
        provider: notification.provider,
        status: "failed",
        failureReason: `${failure.code}: ${failure.message}`,
        requestedAt,
        completedAt
      });
      return serialize(updated);
    }
  }

  async function createAndDeliver(input) {
    const pending = await repository.create({
      ...input,
      provider: smsProvider.name,
      status: "pending",
      attemptCount: 0
    });
    return deliver(pending);
  }

  return Object.freeze({
    async send(input) {
      let deliveries;
      if (input.event) {
        const message = buildEventMessage(input.event);
        deliveries = await Promise.all(
          adminPhoneNumbers.map((phoneNumber, index) =>
            createAndDeliver({
              recipientUserId: `configured-admin-${index + 1}`,
              recipientPhoneNumber: phoneNumber,
              vehicleId: input.event.vehicleId,
              triggerType: input.event.type,
              triggerReferenceId: input.event.eventId ?? input.event.telemetryId,
              message
            })
          )
        );
      } else {
        deliveries = [await createAndDeliver(input)];
      }

      const allSent = deliveries.every((notification) => notification.status === "sent");
      return {
        id: deliveries[0]?.id,
        status: allSent ? "sent" : "failed",
        notifications: deliveries,
        summary: {
          total: deliveries.length,
          sent: deliveries.filter((item) => item.status === "sent").length,
          failed: deliveries.filter((item) => item.status === "failed").length
        }
      };
    },

    async list({ page, pageSize, ...filters }) {
      const result = await repository.list({ filters, page, pageSize });
      return {
        notifications: result.notifications.map(serialize),
        meta: createPaginationMeta({ page, pageSize, totalItems: result.totalItems })
      };
    },

    async getById(id) {
      const notification = await repository.findById(id);
      if (!notification) throw new NotFoundError("Notification not found");
      const attempts = await repository.listAttempts(id);
      return { ...serialize(notification), attempts: attempts.map(serialize) };
    },

    async retry(id) {
      const notification = await repository.findById(id);
      if (!notification) throw new NotFoundError("Notification not found");
      if (notification.status !== "failed") {
        throw new ConflictError("Only failed notifications can be retried");
      }
      return deliver(notification);
    }
  });
}
