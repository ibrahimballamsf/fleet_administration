import {
  loadConfiguration,
  optionalStringSchema,
  portSchema,
  z
} from "@fleet/shared/config";

const schema = z
  .object({
    NOTIFICATION_SERVICE_PORT: portSchema.default(4005),
    MONGODB_URI: z.string().trim().min(1),
    NOTIFICATION_DB_NAME: z.string().trim().min(1).default("fleet_notifications"),
    SMS_PROVIDER: z.enum(["stub", "twilio"]).default("stub"),
    SMS_STUB_MODE: z.enum(["success", "failure"]).default("success"),
    TWILIO_ACCOUNT_SID: optionalStringSchema,
    TWILIO_AUTH_TOKEN: optionalStringSchema,
    TWILIO_FROM_NUMBER: optionalStringSchema
  })
  .superRefine((value, context) => {
    if (value.SMS_PROVIDER !== "twilio") return;

    for (const variable of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"]) {
      if (!value[variable]) {
        context.addIssue({
          code: "custom",
          path: [variable],
          message: `${variable} is required when SMS_PROVIDER is twilio`
        });
      }
    }
  });

const environment = loadConfiguration({ serviceName: "notification-service", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.NOTIFICATION_SERVICE_PORT,
  database: {
    uri: environment.MONGODB_URI,
    name: environment.NOTIFICATION_DB_NAME
  },
  sms: {
    provider: environment.SMS_PROVIDER,
    stubMode: environment.SMS_STUB_MODE,
    twilio: {
      accountSid: environment.TWILIO_ACCOUNT_SID,
      authToken: environment.TWILIO_AUTH_TOKEN,
      fromNumber: environment.TWILIO_FROM_NUMBER
    }
  }
});
