import { randomUUID } from "node:crypto";
import { SmsProviderError } from "./sms-provider-error.js";

export function createStubSmsProvider({ mode = "success" } = {}) {
  return Object.freeze({
    name: "stub",
    async send() {
      if (mode === "failure") {
        throw new SmsProviderError("STUB_FAILURE", "SMS stub configured to fail");
      }
      return { providerMessageId: `stub-${randomUUID()}`, providerStatus: "sent" };
    }
  });
}
