export class SmsProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "SmsProviderError";
    this.code = code;
  }
}
