import { createNotificationClient } from "./clients/notification-client.js";
import { createVehicleApplication } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { createVehicleModel, createVehicleStatusHistoryModel } from "./models/index.js";
import { createVehicleRepository } from "./repositories/vehicle-repository.js";
import { createTokenVerifier } from "./security/token-verifier.js";
import { createVehicleService } from "./services/vehicle-service.js";

async function start() {
  const connection = await connectDatabase();
  const repository = createVehicleRepository({
    Vehicle: createVehicleModel(connection),
    VehicleStatusHistory: createVehicleStatusHistoryModel(connection)
  });
  const tokenVerifier = createTokenVerifier(config.jwt);
  const notificationClient = createNotificationClient({
    baseUrl: config.services.notifications,
    timeoutMs: 5000
  });
  const vehicleService = createVehicleService({ repository, notificationClient });
  const app = createVehicleApplication({
    vehicleService,
    tokenVerifier,
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("Vehicle Service request failed", {
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
    console.log(`Vehicle Service listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`Vehicle Service received ${signal}; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Vehicle Service failed to start", {
    errorName: error?.name,
    errorCode: error?.code
  });
  process.exit(1);
});
