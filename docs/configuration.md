# Configuration

Copy `.env.example` to `.env` at the repository root for local development. Workspace commands search the current directory and its parents for this file. Never commit `.env` or real credentials.

Every backend application loads `.env` and validates its own variables at startup. Invalid configuration stops startup with variable names and validation messages; configured values are not included in errors.

## Shared variables

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `LOG_LEVEL` | Minimum application log level | `info` |
| `MONGODB_URI` | MongoDB server connection | Required by data services |
| `*_SERVICE_PORT` | Listening port for each backend service | 4001–4005 |
| `*_DB_NAME` | Per-service MongoDB database name | `fleet_*` names in `.env.example` |

## Gateway

The gateway requires `API_KEYS` and all five downstream service URLs. Multiple API keys and CORS origins are comma-separated. Rate-limit and proxy timeout values are positive integers measured in milliseconds where applicable.

| Variable | Purpose |
|---|---|
| `GATEWAY_PORT` | Public gateway port |
| `API_KEYS` | Comma-separated accepted gateway keys |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window duration |
| `RATE_LIMIT_MAX_REQUESTS` | Requests permitted per validated key and window |
| `PROXY_TIMEOUT_MS` | Maximum downstream proxy duration |
| `USER_SERVICE_URL` | User Service target |
| `VEHICLE_SERVICE_URL` | Vehicle Service target |
| `TELEMETRY_SERVICE_URL` | Telemetry Service target |
| `GEOLOCATION_SERVICE_URL` | Geolocation Service target |
| `NOTIFICATION_SERVICE_URL` | Notification Service target |

## Authentication

`JWT_SECRET` must contain at least 32 characters. Use a randomly generated secret outside local demonstrations. `JWT_ISSUER` and `JWT_AUDIENCE` bind tokens to this application, and all services that verify the token must use the same values. `BCRYPT_ROUNDS` must be between 10 and 15.

`JWT_EXPIRES_IN` controls session lifetime. `DEMO_PASSWORD` changes seeded account passwords, while `ALLOW_DEMO_SEED=true` is an explicit production-mode safety override and should not be enabled in a real environment.

## Geocoding

`GEOCODER_PROVIDER` accepts `mock` or `nominatim`. The mock provider is the safe default for development and automated tests. A descriptive Nominatim user agent remains required so switching providers fails predictably.

Geocoding results are cached for `GEOCODE_CACHE_TTL_SECONDS`. The Nominatim adapter enforces one serialized request per second and must not be used against the public OpenStreetMap instance for production vehicle tracking; configure a self-hosted or commercial endpoint instead.

`NOMINATIM_BASE_URL`, `NOMINATIM_USER_AGENT`, `GEOCODER_TIMEOUT_MS`, and `MAX_NEARBY_RADIUS_KM` control the provider endpoint, identification, timeout, and accepted search radius.

## SMS

`SMS_PROVIDER` accepts `stub` or `twilio`. Twilio credentials are optional for the stub, but all three Twilio variables become required when `SMS_PROVIDER=twilio`.

`FLEET_ADMIN_PHONE_NUMBERS` is a comma-separated list of E.164 phone numbers. Event notifications create a separate auditable delivery record for each configured administrator. `SMS_STUB_MODE=success` or `failure` controls deterministic local delivery behavior. Twilio uses `TWILIO_API_BASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.

## Frontend

Only variables prefixed with `VITE_` are exposed to the browser. `VITE_DEMO_API_KEY` supports the assignment demonstration and must not be treated as a secret.

`VITE_API_BASE_URL` must be the externally reachable gateway URL. `FRONTEND_PORT` documents the default local port; Vite command-line arguments can override it for tests.

## Secrets

Production JWT secrets, gateway API keys, MongoDB credentials, and Twilio credentials must be stored in the deployment platform's secret manager. They must not be placed in source files, screenshots, logs, or committed environment files.
