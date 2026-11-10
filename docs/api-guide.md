# API guide

## Base URL and documentation

The local public API base URL is `http://localhost:4000`. Send application requests only through the gateway. Swagger UI is available at `/api-docs` and the OpenAPI JSON contract at `/api-docs/openapi.json`.

All `/api/*` requests require `X-API-Key`. Login and registration do not require a JWT; other endpoints require `Authorization: Bearer <token>`.

## Authenticate

```sh
curl --request POST http://localhost:4000/api/users/login \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: development-api-key' \
  --data '{"email":"admin@fleet.test","password":"FleetDemo123!"}'
```

The token is returned as `data.token`. If `jq` is installed, create reusable shell variables:

```sh
API_KEY=development-api-key
TOKEN=$(curl --silent --request POST http://localhost:4000/api/users/login \
  --header 'Content-Type: application/json' \
  --header "X-API-Key: $API_KEY" \
  --data '{"email":"admin@fleet.test","password":"FleetDemo123!"}' \
  | jq --raw-output '.data.token')
```

Do not paste a real production token into documentation, screenshots, or source control.

## List vehicles

```sh
curl http://localhost:4000/api/vehicles \
  --header "X-API-Key: $API_KEY" \
  --header "Authorization: Bearer $TOKEN"
```

## Search for nearby vehicles

The example searches within 50 km of central Brussels:

```sh
curl 'http://localhost:4000/api/maps/vehicles/nearby?latitude=50.8503&longitude=4.3517&radiusKm=50' \
  --header "X-API-Key: $API_KEY" \
  --header "Authorization: Bearer $TOKEN"
```

## Submit telemetry

Replace `VEHICLE_ID` with an ID returned by the vehicle list:

```sh
curl --request POST http://localhost:4000/api/telemetry \
  --header 'Content-Type: application/json' \
  --header "X-API-Key: $API_KEY" \
  --header "Authorization: Bearer $TOKEN" \
  --data '{
    "vehicleId":"VEHICLE_ID",
    "latitude":50.8503,
    "longitude":4.3517,
    "speedKph":62,
    "batteryPercent":78,
    "engineCondition":"normal",
    "odometerKm":80125,
    "recordedAt":"2026-11-08T20:00:00.000Z"
  }'
```

## Trigger a status notification

```sh
curl --request PATCH http://localhost:4000/api/vehicles/VEHICLE_ID/status \
  --header 'Content-Type: application/json' \
  --header "X-API-Key: $API_KEY" \
  --header "Authorization: Bearer $TOKEN" \
  --data '{"status":"maintenance","reason":"Scheduled inspection"}'
```

## Response and error format

Successful responses place the result under `data` and optional pagination under `meta`. Errors use a stable `error.code`, safe `error.message`, optional validation details, and a request ID. See [http-conventions.md](http-conventions.md) for the full contract.

Common statuses are `400` invalid input, `401` missing or invalid credentials, `403` insufficient role, `404` missing resource, `409` conflict, `429` gateway rate limit, and `503` unavailable downstream service.

## Gateway diagnostics

- `GET /health` checks the gateway process.
- `GET /ready` checks downstream service availability.
- Rate-limit information is exposed through `RateLimit`, `RateLimit-Policy`, and `Retry-After` response headers.
- Send `X-Request-Id` to correlate a request, or let the platform generate one.
