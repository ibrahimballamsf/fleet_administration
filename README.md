# Fleet Administration

Fleet Administration is a fleet-management application for keeping track of vehicles, locations, telemetry, operational status, and administrator notifications. It combines a React and Material UI dashboard with a small set of Express services behind one API Gateway.

## What are the available features

- Vehicle registration, operational status, history, and role-based management
- Telemetry ingestion with low-battery, engine-fault, and emergency-stop events
- GeoJSON location storage, address geocoding, map markers, and radius search
- SMS notification delivery through a deterministic stub or Twilio adapter
- API-key validation, per-key rate limiting, proxy routing, and readiness checks
- JWT authentication with administrator, dispatcher, and viewer roles
- Swagger UI backed by a validated OpenAPI 3.0.3 specification
- Unit, integration, frontend, service-integration, and Playwright test suites
- Idempotent demonstration data, Docker Compose, and GitHub Actions validation

## How to run it

You only need Docker Desktop, or Docker Engine with the Compose plugin. From the repository root, run:

```sh
npm run docker:up
```

| Resource | Address |
|---|---|
| FleetFlow frontend | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api-docs |
| Gateway readiness | http://localhost:4000/ready |

Once the containers are healthy, open the frontend and sign in with one of the demonstration accounts below. They all use the password `FleetDemo123!`.

| Role | Email |
|---|---|
| Administrator | `admin@fleet.test` |
| Dispatcher | `dispatcher@fleet.test` |
| Viewer | `viewer@fleet.test` |

When you are finished, `npm run docker:down` stops the containers without deleting the demonstration data. The [local startup guide](docs/local-startup.md) covers logs, reseeding, and running the services directly with Node.

## How the project is Structured

| Path | Purpose |
|---|---|
| `apps/frontend` | React and Material UI administration interface |
| `apps/gateway` | Public Express API Gateway and Swagger UI |
| `apps/user-service` | Authentication, profiles, users, and roles |
| `apps/vehicle-service` | Vehicle records and operational status |
| `apps/telemetry-service` | Telemetry storage and critical events |
| `apps/geolocation-service` | Geocoding, locations, and nearby searches |
| `apps/notification-service` | SMS delivery and notification audit |
| `packages/shared` | Shared configuration and HTTP contracts |
| `test` | Cross-service and browser test support |
| `scripts` | Demonstration seed and smoke validation |
| `docs` | Project, API, operations, testing, and submission documentation |

## Commands you will use most often

```sh
npm ci                    # install exact dependencies
npm run dev               # run workspaces directly
npm run build             # production frontend build
npm test                  # unit, integration, component, and service tests
npm run test:e2e          # Playwright browser suite
npm run docs:validate     # validate OpenAPI
npm run seed              # idempotent demonstration seed
npm run ci:validate       # documentation, build, and source checks
npm run ci:smoke          # verify a running seeded Docker stack
```

## Documentation for the Project

The [documentation index](docs/README.md) is the best starting point. These guides are especially useful:

- [User guide](docs/user-guide.md)
- [API guide](docs/api-guide.md)
- [Configuration](docs/configuration.md)
- [Production deployment plan](docs/deployment.md)
- [Testing and CI](docs/testing.md)
- [Demonstration walkthrough](docs/demonstration.md)
- [Requirements traceability](docs/requirements-traceability.md)
- [Troubleshooting](docs/troubleshooting.md)
