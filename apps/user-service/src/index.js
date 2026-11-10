import { createUserApplication } from "./app.js";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { createUserModel } from "./models/index.js";
import { createUserRepository } from "./repositories/user-repository.js";
import { createPasswordHasher } from "./security/password-hasher.js";
import { createTokenService } from "./security/token-service.js";
import { createUserService } from "./services/user-service.js";

async function start() {
  const connection = await connectDatabase();
  const repository = createUserRepository(createUserModel(connection));
  const passwordHasher = createPasswordHasher(config.bcryptRounds);
  const tokenService = createTokenService(config.jwt);
  const userService = createUserService({ repository, passwordHasher, tokenService });
  const app = createUserApplication({
    userService,
    tokenService,
    onError({ error, requestId, method, path, statusCode }) {
      if (statusCode >= 500) {
        console.error("User Service request failed", {
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
    console.log(`User Service listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`User Service received ${signal}; shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("User Service failed to start", error);
  process.exit(1);
});
