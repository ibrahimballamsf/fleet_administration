function requiredValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`[frontend] ${name} is required.`);
  return value;
}

export function parseFrontendConfiguration(environment) {
  const apiBaseUrl = requiredValue(environment, "VITE_API_BASE_URL");
  const demoApiKey = requiredValue(environment, "VITE_DEMO_API_KEY");

  let parsedUrl;
  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("[frontend] VITE_API_BASE_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("[frontend] VITE_API_BASE_URL must use HTTP or HTTPS.");
  }

  return Object.freeze({ apiBaseUrl: parsedUrl.toString().replace(/\/$/, ""), demoApiKey });
}

export const config = parseFrontendConfiguration(import.meta.env);
