import { SmsProviderError } from "./sms-provider-error.js";

export function createTwilioSmsProvider({
  accountSid,
  authToken,
  fromNumber,
  baseUrl = "https://api.twilio.com",
  timeoutMs = 5000,
  fetchImplementation = fetch
}) {
  return Object.freeze({
    name: "twilio",
    async send({ to, message }) {
      const url = `${baseUrl.replace(/\/$/, "")}/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({ To: to, From: fromNumber, Body: message });
      let response;
      try {
        response = await fetchImplementation(url, {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded"
          },
          body,
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (error) {
        throw new SmsProviderError("TWILIO_UNAVAILABLE", "Twilio is unavailable", { cause: error });
      }

      if (!response.ok) {
        throw new SmsProviderError("TWILIO_REJECTED", `Twilio rejected the message with HTTP ${response.status}`);
      }
      const result = await response.json();
      return { providerMessageId: result.sid, providerStatus: result.status };
    }
  });
}
