# Vehicle Service

The Vehicle Service keeps the fleet catalogue in one place. It handles registration, search and retrieval, editable vehicle details, operational status changes, status history, and administrator-only deletion.

## Routes

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/vehicles` | Administrator or dispatcher |
| `GET` | `/api/vehicles` | Authenticated user |
| `GET` | `/api/vehicles/:id` | Authenticated user |
| `PATCH` | `/api/vehicles/:id` | Administrator or dispatcher |
| `PATCH` | `/api/vehicles/:id/status` | Administrator or dispatcher |
| `PATCH` | `/api/vehicles/:id/telemetry-summary` | Administrator or dispatcher |
| `GET` | `/api/vehicles/:id/status-history` | Authenticated user |
| `DELETE` | `/api/vehicles/:id` | Administrator |

When a vehicle changes status, the service saves that change before asking the Notification Service to alert the relevant users. If notification delivery fails, the status change remains valid and the response clearly reports the integration failure.

