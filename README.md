# Fleet Administration

Fleet Management System Repo for BITS Pilani assignment

## Workspace layout

- `apps/frontend` — React administration interface.
- `apps/gateway` — public Express API Gateway.
- `apps/user-service` — authentication, users, and roles.
- `apps/vehicle-service` — vehicle records and operational status.
- `apps/telemetry-service` — telemetry and critical vehicle events.
- `apps/geolocation-service` — geocoding, stored locations, and nearby searches.
- `apps/notification-service` — SMS delivery and notification records.
- `packages/shared` — framework-agnostic shared utilities and contracts.
- `docs` — architecture, API, testing, and demonstration documentation.
- `test` — cross-service and end-to-end test support.
- `scripts` — repository-level operational scripts.

Configuration variables and validation rules are documented in [`docs/configuration.md`](docs/configuration.md). Copy `.env.example` to `.env` to run the application locally.

All backend services follow the response, error, status-code, and request-ID contract in [`docs/http-conventions.md`](docs/http-conventions.md).

## Local User Service

1. Ensure the repository-root `.env` contains local values based on `.env.example`.
2. Start MongoDB with `npm run db:up`.
3. Start the service with `npm run dev --workspace=@fleet/user-service`.

MongoDB data is retained in the `fleet_mongodb_data` Docker volume. `npm run db:down` stops the local container without deleting that volume.
