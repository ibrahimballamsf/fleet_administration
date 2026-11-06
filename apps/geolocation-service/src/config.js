import {
  loadConfiguration,
  portSchema,
  positiveIntegerSchema,
  urlSchema,
  z
} from "@fleet/shared/config";

const schema = z.object({
  GEOLOCATION_SERVICE_PORT: portSchema.default(4004),
  MONGODB_URI: z.string().trim().min(1),
  GEOLOCATION_DB_NAME: z.string().trim().min(1).default("fleet_geolocation"),
  GEOCODER_PROVIDER: z.enum(["mock", "nominatim"]).default("mock"),
  NOMINATIM_BASE_URL: urlSchema.default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().trim().min(1),
  GEOCODER_TIMEOUT_MS: positiveIntegerSchema.default(5000),
  MAX_NEARBY_RADIUS_KM: z.coerce.number().positive().max(500).default(100)
});

const environment = loadConfiguration({ serviceName: "geolocation-service", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.GEOLOCATION_SERVICE_PORT,
  database: {
    uri: environment.MONGODB_URI,
    name: environment.GEOLOCATION_DB_NAME
  },
  geocoder: {
    provider: environment.GEOCODER_PROVIDER,
    baseUrl: environment.NOMINATIM_BASE_URL,
    userAgent: environment.NOMINATIM_USER_AGENT,
    timeoutMs: environment.GEOCODER_TIMEOUT_MS
  },
  maxNearbyRadiusKm: environment.MAX_NEARBY_RADIUS_KM
});
