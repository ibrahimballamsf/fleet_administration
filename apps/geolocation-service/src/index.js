import { createGeolocationApplication } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { createGeocodeCacheModel, createVehicleLocationModel } from "./models/index.js";
import { createGeocoder } from "./providers/index.js";
import { createGeolocationRepository } from "./repositories/geolocation-repository.js";
import { createTokenVerifier } from "./security/token-verifier.js";
import { createGeolocationService } from "./services/geolocation-service.js";

async function start() {
  const connection = await connectDatabase();
  const repository = createGeolocationRepository({
    VehicleLocation: createVehicleLocationModel(connection),
    GeocodeCache: createGeocodeCacheModel(connection)
  });
  const geolocationService = createGeolocationService({
    repository,
    geocoder: createGeocoder(config.geocoder),
    cacheTtlSeconds: config.geocoder.cacheTtlSeconds,
    maxNearbyRadiusKm: config.maxNearbyRadiusKm
  });
  const app = createGeolocationApplication({
    geolocationService,
    tokenVerifier: createTokenVerifier(config.jwt),
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("Geolocation Service request failed", {
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
    console.log(`Geolocation Service listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`Geolocation Service received ${signal}; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Geolocation Service failed to start", {
    errorName: error?.name,
    errorCode: error?.code
  });
  process.exit(1);
});
