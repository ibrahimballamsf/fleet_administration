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
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().trim().min(1).default("fleet-user-service"),
  JWT_AUDIENCE: z.string().trim().min(1).default("fleet-api"),
  GEOCODER_PROVIDER: z.enum(["mock", "nominatim"]).default("mock"),
  NOMINATIM_BASE_URL: urlSchema.default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().trim().min(1),
  GEOCODER_TIMEOUT_MS: positiveIntegerSchema.default(5000),
  GEOCODE_CACHE_TTL_SECONDS: positiveIntegerSchema.default(86400),
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
  jwt: {
    secret: environment.JWT_SECRET,
    issuer: environment.JWT_ISSUER,
    audience: environment.JWT_AUDIENCE
  },
  geocoder: {
    provider: environment.GEOCODER_PROVIDER,
    baseUrl: environment.NOMINATIM_BASE_URL,
    userAgent: environment.NOMINATIM_USER_AGENT,
    timeoutMs: environment.GEOCODER_TIMEOUT_MS,
    cacheTtlSeconds: environment.GEOCODE_CACHE_TTL_SECONDS
  },
  maxNearbyRadiusKm: environment.MAX_NEARBY_RADIUS_KM
});
