import dotenv from "dotenv";
import { z } from "zod";

export { z };

export const environmentSchema = z.enum(["development", "test", "production"]);
export const portSchema = z.coerce.number().int().min(1).max(65535);
export const positiveIntegerSchema = z.coerce.number().int().positive();
export const urlSchema = z.string().trim().url();

export const commaSeparatedSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
  .pipe(z.array(z.string().min(1)).min(1));

export const optionalStringSchema = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const baseSchema = z.object({
  NODE_ENV: environmentSchema.default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

function formatConfigurationError(serviceName, error) {
  const issues = error.issues.map((issue) => {
    const variable = issue.path.join(".") || "environment";
    return `- ${variable}: ${issue.message}`;
  });

  return new Error(
    `[${serviceName}] Invalid configuration:\n${issues.join("\n")}\n` +
      "Review .env.example and provide the required environment variables."
  );
}

export function loadConfiguration({
  serviceName,
  schema,
  environment = process.env,
  dotenvPath,
  loadDotenv = environment === process.env
}) {
  if (!serviceName) {
    throw new Error("A serviceName is required when loading configuration.");
  }

  if (loadDotenv) {
    dotenv.config({ path: dotenvPath, quiet: true });
  }

  const result = baseSchema.and(schema).safeParse(environment);

  if (!result.success) {
    throw formatConfigurationError(serviceName, result.error);
  }

  return Object.freeze(result.data);
}
