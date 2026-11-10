import { createNotificationApplication } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { createNotificationAttemptModel, createNotificationModel } from "./models/index.js";
import { createSmsProvider } from "./providers/index.js";
import { createNotificationRepository } from "./repositories/notification-repository.js";
import { createTokenVerifier } from "./security/token-verifier.js";
import { createNotificationService } from "./services/notification-service.js";

async function start() {
  const connection = await connectDatabase();
  const notificationService = createNotificationService({
    repository: createNotificationRepository({
      Notification: createNotificationModel(connection),
      NotificationAttempt: createNotificationAttemptModel(connection)
    }),
    smsProvider: createSmsProvider(config.sms),
    adminPhoneNumbers: config.adminPhoneNumbers
  });
  const app = createNotificationApplication({
    notificationService,
    tokenVerifier: createTokenVerifier(config.jwt),
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("Notification Service request failed", {
          errorName: error?.name,
          errorCode: error?.code,
          requestId,
          method,
          path
        });
      }
    }
  });

  const server = app.listen(config.port, () => {
    console.log(`Notification Service listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`Notification Service received ${signal}; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Notification Service failed to start", {
    errorName: error?.name,
    errorCode: error?.code
  });
  process.exit(1);
});
