# Configuration

Copy `.env.example` to `.env` at the repository root for local development. Workspace commands search the current directory and its parents for this file. Never commit `.env` or real credentials.

Every backend application loads `.env` and validates its own variables at startup. Invalid configuration stops startup with variable names and validation messages; configured values are not included in errors.

## Shared variables

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `LOG_LEVEL` | Minimum application log level | `info` |
| `MONGODB_URI` | MongoDB server connection | Required by data services |

## Gateway

The gateway requires `API_KEYS` and all five downstream service URLs. Multiple API keys and CORS origins are comma-separated. Rate-limit and proxy timeout values are positive integers measured in milliseconds where applicable.

## Authentication

`JWT_SECRET` must contain at least 32 characters. Use a randomly generated secret outside local demonstrations. `JWT_ISSUER` and `JWT_AUDIENCE` bind tokens to this application, and all services that verify the token must use the same values. `BCRYPT_ROUNDS` must be between 10 and 15.

## Geocoding

`GEOCODER_PROVIDER` accepts `mock` or `nominatim`. The mock provider is the safe default for development and automated tests. A descriptive Nominatim user agent remains required so switching providers fails predictably.

## SMS

`SMS_PROVIDER` accepts `stub` or `twilio`. Twilio credentials are optional for the stub, but all three Twilio variables become required when `SMS_PROVIDER=twilio`.

## Frontend

Only variables prefixed with `VITE_` are exposed to the browser. `VITE_DEMO_API_KEY` supports the assignment demonstration and must not be treated as a secret.

## Secrets

Production JWT secrets, gateway API keys, MongoDB credentials, and Twilio credentials must be stored in the deployment platform's secret manager. They must not be placed in source files, screenshots, logs, or committed environment files.
