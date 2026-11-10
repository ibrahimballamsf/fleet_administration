import { createStubSmsProvider } from "./stub-sms-provider.js";
import { createTwilioSmsProvider } from "./twilio-sms-provider.js";

export function createSmsProvider(config) {
  if (config.provider === "stub") return createStubSmsProvider({ mode: config.stubMode });
  return createTwilioSmsProvider({ ...config.twilio, timeoutMs: config.timeoutMs });
}

export { createStubSmsProvider, createTwilioSmsProvider };
