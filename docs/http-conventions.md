# Shared HTTP conventions

These conventions apply to the API Gateway and every backend service.

## Transport and representation

- Public application routes use the `/api/<resource>` prefixes defined by the gateway.
- JSON requests use `Content-Type: application/json`.
- JSON responses use UTF-8.
- Property and query-parameter names use `camelCase`.
- Resource identifiers are serialized as strings.
- Dates and times use ISO 8601 UTC strings, for example `2026-11-06T15:30:00.000Z`.
- Distances exposed by the API use kilometres unless the property explicitly states otherwise.

## Authentication headers

Gateway requests use `X-API-Key`. Authenticated user requests also use `Authorization: Bearer <JWT>`. The gateway forwards the authorization header to the target service.

## Request IDs

Clients may supply `X-Request-Id` containing 1–128 letters, numbers, dots, underscores, colons, or hyphens. Unsafe or missing values are replaced with a UUID. The selected ID is attached to `request.id`, returned as the `X-Request-Id` response header, included in errors and logs, and forwarded between services.

## Successful responses

Successful JSON response returns data in this format

```json
{
  "data": {
    "id": "vehicle-1"
  },
  "meta": {}
}
```

Creation returns `201`. A successful operation with no response body returns `204` without the JSON envelope.

Collections place pagination information in `meta`:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasPreviousPage": false,
      "hasNextPage": true
    }
  }
}
```

## Error responses

Errors use this envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "code": "too_small",
        "path": "radiusKm",
        "message": "Value must be greater than 0"
      }
    ],
    "requestId": "7e86be6a-cdf5-4f70-bab8-2928d5c82779"
  }
}
```

Operational client errors may expose actionable messages and validation details. Unexpected server errors return a generic message and empty details. Stack traces, credentials, provider responses, and database errors must never be returned to clients.

## Status codes

| Status | Meaning |
|---:|---|
| `200` | Retrieval or update succeeded |
| `201` | Resource created |
| `202` | Work accepted but integration processing is incomplete |
| `204` | Operation succeeded with no body |
| `400` | Invalid syntax, JSON, parameters, or validation data |
| `401` | Authentication or API key is missing |
| `403` | Credentials are invalid or the user lacks permission |
| `404` | Resource or route not found |
| `409` | Duplicate resource or state conflict |
| `422` | Valid syntax but invalid domain operation, where needed |
| `429` | Gateway rate limit exceeded |
| `500` | Unexpected internal failure |
| `503` | Target service unavailable |
| `504` | Target service timed out |
