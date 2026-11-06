import mongoose from "mongoose";

const { Schema } = mongoose;

export const notificationAttemptSchema = new Schema(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: "Notification", required: true },
    attemptNumber: { type: Number, min: 1, required: true },
    provider: { type: String, enum: ["stub", "twilio"], required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    providerMessageId: { type: String, trim: true },
    failureReason: { type: String, trim: true, maxlength: 1000 },
    requestedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

notificationAttemptSchema.index(
  { notificationId: 1, attemptNumber: 1 },
  { unique: true }
);

export function createNotificationAttemptModel(connection) {
  return (
    connection.models.NotificationAttempt ??
    connection.model("NotificationAttempt", notificationAttemptSchema)
  );
}
