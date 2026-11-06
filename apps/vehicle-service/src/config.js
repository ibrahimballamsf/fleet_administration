import { loadConfiguration, portSchema, urlSchema, z } from "@fleet/shared/config";

const schema = z.object({
  VEHICLE_SERVICE_PORT: portSchema.default(4002),
  MONGODB_URI: z.string().trim().min(1),
  VEHICLE_DB_NAME: z.string().trim().min(1).default("fleet_vehicles"),
  GEOLOCATION_SERVICE_URL: urlSchema,
  NOTIFICATION_SERVICE_URL: urlSchema
});

const environment = loadConfiguration({ serviceName: "vehicle-service", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.VEHICLE_SERVICE_PORT,
  database: {
    uri: environment.MONGODB_URI,
    name: environment.VEHICLE_DB_NAME
  },
  services: {
    geolocation: environment.GEOLOCATION_SERVICE_URL,
    notifications: environment.NOTIFICATION_SERVICE_URL
  }
});
