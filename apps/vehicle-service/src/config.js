import { loadConfiguration, portSchema, urlSchema, z } from "@fleet/shared/config";

const schema = z.object({
  VEHICLE_SERVICE_PORT: portSchema.default(4002),
  MONGODB_URI: z.string().trim().min(1),
  VEHICLE_DB_NAME: z.string().trim().min(1).default("fleet_vehicles"),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().trim().min(1).default("fleet-user-service"),
  JWT_AUDIENCE: z.string().trim().min(1).default("fleet-api"),
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
  jwt: {
    secret: environment.JWT_SECRET,
    issuer: environment.JWT_ISSUER,
    audience: environment.JWT_AUDIENCE
  },
  services: {
    geolocation: environment.GEOLOCATION_SERVICE_URL,
    notifications: environment.NOTIFICATION_SERVICE_URL
  }
});
