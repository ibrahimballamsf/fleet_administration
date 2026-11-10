import { createGatewayApplication } from "./app.js";
import { config } from "./config.js";
import { loadOpenApiDocument } from "./openapi.js";

async function start() {
  const app = createGatewayApplication({
    gatewayConfig: config,
    openApiDocument: await loadOpenApiDocument(),
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("Gateway request failed", {
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
    console.log(`API Gateway listening on port ${config.port}`);
    console.log(`Swagger UI available at http://localhost:${config.port}/api-docs`);
  });

  function shutdown(signal) {
    console.log(`API Gateway received ${signal}; shutting down`);
    server.close(() => process.exit(0));
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("API Gateway failed to start", {
    errorName: error?.name,
    errorCode: error?.code
  });
  process.exit(1);
});
