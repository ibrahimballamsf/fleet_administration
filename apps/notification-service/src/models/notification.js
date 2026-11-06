import mongoose from "mongoose";

const { Schema } = mongoose;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export const NOTIFICATION_STATUSES = Object.freeze(["pending", "sent", "failed"]);
export const NOTIFICATION_TRIGGERS = Object.freeze([
  "engine_fault",
  "low_battery",
  "emergency_stop",
  "status_change"
]);

export const notificationSchema = new Schema(
  {
    recipientUserId: { type: String, required: true, trim: true },
    recipientPhoneNumber: { type: String, required: true, trim: true, match: E164_PHONE },
    vehicleId: { type: String, required: true, trim: true },
    triggerType: { type: String, enum: NOTIFICATION_TRIGGERS, required: true },
    triggerReferenceId: { type: String, trim: true },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 1600 },
    provider: { type: String, enum: ["stub", "twilio"], required: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending" },
    providerMessageId: { type: String, trim: true },
    failureReason: { type: String, trim: true, maxlength: 1000 },
    sentAt: Date,
    attemptCount: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true, optimisticConcurrency: true }
);

notificationSchema.index({ vehicleId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ triggerType: 1, createdAt: -1 });

export function createNotificationModel(connection) {
  return connection.models.Notification ?? connection.model("Notification", notificationSchema);
}
