# Local startup

## One-command Docker stack

Requirements: Docker Desktop or Docker Engine with the Compose plugin.

```sh
npm run docker:up
```

The command builds one reusable application image, starts MongoDB, runs the idempotent demonstration seed, waits for service health checks, and then starts the gateway and frontend.

| Application | URL |
|---|---|
| FleetFlow frontend | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api-docs |
| Gateway readiness | http://localhost:4000/ready |

Demo accounts share the local-only password `FleetDemo123!`:

| Role | Email |
|---|---|
| Administrator | `admin@fleet.test` |
| Dispatcher | `dispatcher@fleet.test` |
| Viewer | `viewer@fleet.test` |

Override the demo password for a new stack by setting `DEMO_PASSWORD` before startup. The value is used only to hash demonstration user credentials and is not exposed to the frontend.

Useful commands:

```sh
npm run docker:ps
npm run docker:logs
npm run docker:down
```

`docker:down` preserves the named MongoDB volume. To intentionally delete all local database data, run `docker compose down -v`; this operation is destructive.

## Reseed demonstration data

The seed uses deterministic identifiers and upserts, so it can be run repeatedly without creating duplicates:

```sh
docker compose run --rm seed
```

The seed refreshes demonstration values while preserving the same cross-service identifiers.

## Run services directly with Node

1. Copy `.env.example` to `.env` and review its local values.
2. Install packages with `npm install`.
3. Start MongoDB with `npm run db:up`.
4. Seed data with `npm run seed`.
5. Start all applications with `npm run dev`.

The direct Node workflow uses the localhost URLs and database names from `.env`. Stop the applications with `Ctrl+C` and MongoDB with `npm run db:down`.

## Startup sequence

Compose enforces the following dependency order:

1. MongoDB passes its ping health check.
2. The seed container completes successfully.
3. User, Geolocation, and Notification services become healthy.
4. Vehicle and Telemetry services become healthy.
5. The API Gateway reports every downstream service available.
6. The frontend preview starts.

All backend containers use internal service names rather than host ports. Only MongoDB, the gateway, and frontend are published to the host.

The MongoDB container sets `GLIBC_TUNABLES=glibc.pthread.rseq=1` as a compatibility workaround for the MongoDB/TCMalloc startup failure on Linux kernel 6.19 and newer. This is local and CI infrastructure configuration and does not affect application data or API behavior.
