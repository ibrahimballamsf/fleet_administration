# Testing

The backend test strategy separates fast Mocha/Chai unit tests from HTTP integration tests. Unit tests replace repositories, providers, and service clients with in-memory fakes, so they do not require MongoDB, external APIs, SMS credentials, or running services.

## Install dependencies

From the repository root:

```sh
npm install
```

## Run tests

Run the 24 backend unit tests:

```sh
npm run test:unit
```

Run the existing HTTP and model integration tests:

```sh
npm run test:integration
```

Run only the cross-service integration suite:

```sh
npm run test:service-integration
```

Run every workspace test, including frontend, backend integration, and backend unit suites:

```sh
npm test
```

Run the React component suite with Vitest and React Testing Library:

```sh
npm run test:frontend
```

Install Playwright's portable Chromium once, then run the browser suite:

```sh
npx playwright install chromium
npm run test:e2e
```

End-to-end tests are intentionally separate from `npm test` because they start the Vite application, launch a browser, and bind temporary localhost servers.

If ports 3000 or 4000 are already occupied, isolate the test servers with `E2E_FRONTEND_PORT` and `E2E_GATEWAY_PORT`, for example:

```sh
E2E_FRONTEND_PORT=3100 E2E_GATEWAY_PORT=4100 npm run test:e2e
```

Run one backend service in isolation:

```sh
npm run test:unit --workspace=@fleet/telemetry-service
npm run test:integration --workspace=@fleet/telemetry-service
```

## Unit-test coverage

- API Gateway: missing/invalid API keys, validated-key fingerprinting, ready and degraded dependency health.
- User Service: safe registration defaults, duplicate emails, login sessions, list filtering and pagination.
- Vehicle Service: GeoJSON conversion, status history, notification failure tolerance, stale telemetry protection.
- Geolocation Service: cache hits and writes, vehicle location storage, radius limits, nearby-vehicle queries.
- Telemetry Service: normal readings, critical-event classification, notification outcomes, downstream failure isolation.
- Notification Service: successful SMS auditing, safe provider failures, administrator fan-out, retry rules.

## Service-integration coverage

The Mocha/Chai service-integration fixture connects the real Vehicle, Geolocation, Telemetry, and Notification service implementations through in-memory repositories and adapters. It verifies:

- Telemetry location synchronization into Vehicle and Geolocation services.
- Automatic low-battery event classification, SMS generation, and delivery auditing.
- Vehicle operational-status notifications and status history.
- Cross-service stale telemetry protection.
- Persistence of telemetry and events when SMS delivery fails.
- Early rejection of telemetry for unknown vehicles without partial downstream writes.

These tests use a recording SMS stub and require neither MongoDB nor network access.

## Frontend coverage

The Vitest/jsdom suite renders the real Material UI components with React Testing Library and verifies:

- Telemetry viewer restrictions, numeric payload conversion, and vehicle-coordinate resets.
- User creation payload normalization and temporary-password handling.
- Profile contact and SMS-preference editing.
- Busy-state action protection.
- Role-change validation and administrator permission warnings.
- Frontend environment-variable validation.

The existing API-client tests continue to verify API-key/JWT headers, public login requests, missing sessions, normalized gateway errors, and transport failures.

## End-to-end coverage

Playwright launches the real React application and a stateful mock gateway. The browser suite covers invalid and valid login, dashboard loading, telemetry submission and history refresh, viewer account creation, role reassignment, and retrying a failed SMS notification. The mock gateway keeps the suite deterministic and removes MongoDB, Twilio, and external-map dependencies.

The HTTP integration tests use temporary localhost listeners. In restricted environments, allow Node to bind to loopback when running `npm test` or `npm run test:integration`.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs for every push and pull request and can also be started manually. It contains independent jobs for:

- OpenAPI and seed-script validation, a production frontend build, and Docker Compose configuration validation.
- All workspace unit, HTTP integration, component, and cross-service integration tests.
- Playwright browser tests using Chromium, with the HTML report and traces retained as workflow artifacts.
- A real Docker Compose startup followed by administrator login and seeded vehicle, map, and notification checks through the public gateway.

The Compose MongoDB service includes the upstream `GLIBC_TUNABLES=glibc.pthread.rseq=1` workaround required by GitHub-hosted runners using Linux kernel 6.19 or newer.

Run the same validation commands locally with:

```sh
npm ci
npm run ci:validate
npm test
npx playwright install chromium
npm run test:e2e
npm run docker:up
npm run ci:smoke
npm run docker:down
```
