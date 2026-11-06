import {
  loadConfiguration,
  portSchema,
  positiveIntegerSchema,
  z
} from "@fleet/shared/config";

const schema = z.object({
  USER_SERVICE_PORT: portSchema.default(4001),
  MONGODB_URI: z.string().trim().min(1),
  USER_DB_NAME: z.string().trim().min(1).default("fleet_users"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("1h"),
  BCRYPT_ROUNDS: positiveIntegerSchema.min(10).max(15).default(12)
});

const environment = loadConfiguration({ serviceName: "user-service", schema });

export const config = Object.freeze({
  nodeEnv: environment.NODE_ENV,
  logLevel: environment.LOG_LEVEL,
  port: environment.USER_SERVICE_PORT,
  database: {
    uri: environment.MONGODB_URI,
    name: environment.USER_DB_NAME
  },
  jwt: {
    secret: environment.JWT_SECRET,
    expiresIn: environment.JWT_EXPIRES_IN
  },
  bcryptRounds: environment.BCRYPT_ROUNDS
});
