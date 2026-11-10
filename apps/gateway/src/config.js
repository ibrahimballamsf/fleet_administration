import {
  commaSeparatedSchema,
  loadConfiguration,
  portSchema,
  positiveIntegerSchema,
  urlSchema,
  z
} from "@fleet/shared/config";

const schema = z.object({
  GATEWAY_PORT: portSchema.default(4000),
  API_KEYS: commaSeparatedSchema,
  USER_SERVICE_URL: urlSchema,
  VEHICLE_SERVICE_URL: urlSchema,
  TELEMETRY_SERVICE_URL: urlSchema,
  GEOLOCATION_SERVICE_URL: urlSchema,
  NOTIFICATION_SERVICE_URL: urlSchema,
  CORS_ORIGINS: commaSeparatedSchema.prefault("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: positiveIntegerSchema.default(60000),
  RATE_LIMIT_MAX_REQUESTS: positiveIntegerSchema.default(100),
  PROXY_TIMEOUT_MS: positiveIntegerSchema.default(5000)
});

const environment = loadConfiguration({ serviceName: "gateway", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.GATEWAY_PORT,
  apiKeys: environment.API_KEYS,
  corsOrigins: environment.CORS_ORIGINS,
  rateLimit: {
    windowMs: environment.RATE_LIMIT_WINDOW_MS,
    maxRequests: environment.RATE_LIMIT_MAX_REQUESTS
  },
  proxyTimeoutMs: environment.PROXY_TIMEOUT_MS,
  services: {
    users: environment.USER_SERVICE_URL,
    vehicles: environment.VEHICLE_SERVICE_URL,
    telemetry: environment.TELEMETRY_SERVICE_URL,
    geolocation: environment.GEOLOCATION_SERVICE_URL,
    notifications: environment.NOTIFICATION_SERVICE_URL
  }
});
