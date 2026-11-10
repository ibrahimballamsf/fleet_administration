import { createGeolocationClient } from "./clients/geolocation-client.js";
import { createNotificationClient } from "./clients/notification-client.js";
import { createVehicleClient } from "./clients/vehicle-client.js";
import { createTelemetryApplication } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { createTelemetryModel, createVehicleEventModel } from "./models/index.js";
import { createTelemetryRepository } from "./repositories/telemetry-repository.js";
import { createTokenVerifier } from "./security/token-verifier.js";
import { createTelemetryService } from "./services/telemetry-service.js";

async function start() {
  const connection = await connectDatabase();
  const telemetryService = createTelemetryService({
    repository: createTelemetryRepository({
      Telemetry: createTelemetryModel(connection),
      VehicleEvent: createVehicleEventModel(connection)
    }),
    vehicleClient: createVehicleClient({ baseUrl: config.services.vehicles }),
    geolocationClient: createGeolocationClient({ baseUrl: config.services.geolocation }),
    notificationClient: createNotificationClient({ baseUrl: config.services.notifications })
  });
  const app = createTelemetryApplication({
    telemetryService,
    tokenVerifier: createTokenVerifier(config.jwt),
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("Telemetry Service request failed", {
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
    console.log(`Telemetry Service listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`Telemetry Service received ${signal}; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Telemetry Service failed to start", {
    errorName: error?.name,
    errorCode: error?.code
  });
  process.exit(1);
});
