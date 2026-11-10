import mongoose from "mongoose";

const { Schema } = mongoose;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export const USER_ROLES = Object.freeze(["admin", "dispatcher", "viewer"]);

export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    passwordHash: { type: String, required: true, select: false },
    phoneNumber: { type: String, trim: true, match: E164_PHONE },
    role: { type: String, enum: USER_ROLES, default: "viewer", index: true },
    notificationPreferences: {
      criticalEvents: { type: Boolean, default: true },
      statusChanges: { type: Boolean, default: true }
    },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      transform(_document, result) {
        result.id = result._id.toString();
        delete result._id;
        delete result.__v;
        delete result.passwordHash;
        return result;
      }
    }
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

export function createUserModel(connection) {
  return connection.models.User ?? connection.model("User", userSchema);
}
