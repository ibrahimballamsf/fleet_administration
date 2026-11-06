import { loadConfiguration, portSchema, urlSchema, z } from "@fleet/shared/config";

const schema = z.object({
  TELEMETRY_SERVICE_PORT: portSchema.default(4003),
  MONGODB_URI: z.string().trim().min(1),
  TELEMETRY_DB_NAME: z.string().trim().min(1).default("fleet_telemetry"),
  VEHICLE_SERVICE_URL: urlSchema,
  GEOLOCATION_SERVICE_URL: urlSchema,
  NOTIFICATION_SERVICE_URL: urlSchema
});

const environment = loadConfiguration({ serviceName: "telemetry-service", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.TELEMETRY_SERVICE_PORT,
  database: {
    uri: environment.MONGODB_URI,
    name: environment.TELEMETRY_DB_NAME
  },
  services: {
    vehicles: environment.VEHICLE_SERVICE_URL,
    geolocation: environment.GEOLOCATION_SERVICE_URL,
    notifications: environment.NOTIFICATION_SERVICE_URL
  }
});
