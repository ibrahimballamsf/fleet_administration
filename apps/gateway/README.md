# API Gateway

The API Gateway is the front door to the backend. Clients call one public Express application, and the gateway checks their API key, applies rate limits, and forwards each request to the service that owns the data. It also provides consistent proxy errors, health checks, and Swagger UI.

## Where requests go

| Gateway prefix | Target |
| --- | --- |
| `/api/users/*` | User service |
| `/api/vehicles/*` | Vehicle service |
| `/api/telemetry/*` | Telemetry service |
| `/api/maps/*` | Geolocation service |
| `/api/notifications/*` | Notification service |

## Useful public routes

- `GET /health` — gateway process health.
- `GET /ready` — downstream service readiness.
- `GET /api-docs` — interactive Swagger UI.
- `GET /api-docs/openapi.json` — machine-readable OpenAPI document.

Every `/api/*` request needs an `X-API-Key` header. Routes protected by user authentication also need `Authorization: Bearer <token>`. Limits are tracked per valid API key, and responses include the standard rate-limit headers so clients can see what remains.

## Run it locally

Create the repository-root `.env` from `.env.example`, start the five backend services, and then run:

```sh
npm run dev --workspace=@fleet/gateway
```

Once it starts, visit `http://localhost:4000/api-docs` to explore the API. You can validate the source contract and run the gateway tests with:

```sh
npm run docs:validate
npm test --workspace=@fleet/gateway
```

