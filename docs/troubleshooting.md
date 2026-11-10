# Troubleshooting

## Configuration is invalid

If startup reports missing `MONGODB_URI`, `JWT_SECRET`, or another variable, copy the example file and review it:

```sh
cp .env.example .env
```

Workspace services search parent directories for the repository-root `.env`. Configuration errors report variable names but intentionally do not print secret values.

## A port is already in use

The default host ports are 3000, 4000, and 27017. Inspect Compose state with `npm run docker:ps`. Stop this project with `npm run docker:down`; do not delete volumes unless you intentionally want to remove local data.

For Playwright conflicts, use alternate ports:

```sh
E2E_FRONTEND_PORT=3100 E2E_GATEWAY_PORT=4100 npm run test:e2e
```

## MongoDB is unhealthy

Inspect the database log:

```sh
docker compose logs mongodb
```

The Compose service includes `GLIBC_TUNABLES=glibc.pthread.rseq=1` for the MongoDB/TCMalloc incompatibility on Linux kernel 6.19 and newer. If the volume contains disposable demonstration data and initialization is corrupted, `docker compose down -v` removes it permanently; run `npm run docker:up` afterward to recreate and reseed it.

## A service is unhealthy

```sh
npm run docker:ps
docker compose logs SERVICE_NAME
curl http://localhost:4000/ready
```

Check the first failing dependency in the startup order rather than restarting every service. The gateway starts only after all five backend services are healthy.

## API returns 401 or 403

- `401 INVALID_API_KEY`: add the configured `X-API-Key` header.
- `401 UNAUTHORIZED`: sign in again and send the returned JWT as a Bearer token.
- `403 FORBIDDEN`: the authenticated role cannot perform the operation. Consult the matrix in [user-guide.md](user-guide.md).

## API returns 429

The gateway rate limit was exceeded for the API key. Wait for `Retry-After`, reduce request frequency, or adjust the local rate-limit variables for an intentional load test.

## API returns 503

The target service is unavailable or exceeded the proxy timeout. Check `/ready`, the service health state, and its container log. The response request ID can be used to correlate logs.

## Geocoding returns no result

The default mock provider recognizes demonstration inputs only. Use a seeded location or set `GEOCODER_PROVIDER=nominatim` with a descriptive user agent and an appropriate endpoint. Public Nominatim is not suitable for production fleet tracking.

## SMS remains failed

`SMS_STUB_MODE=failure` intentionally records failed deliveries. Set it to `success` and recreate the Notification Service for a successful local retry. For Twilio, verify all credentials and the sender/recipient restrictions of the configured account or sandbox.

## CI Docker job fails

Download the `docker-compose-logs` workflow artifact. The CI cleanup step removes containers and volumes even after failure, so the artifact is the durable diagnostic record.
