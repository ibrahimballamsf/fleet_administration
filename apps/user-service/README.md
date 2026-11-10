# User Service

The User Service is responsible for identity across the application. It stores user accounts and profiles, verifies passwords, issues JWTs, and enforces the administrator, dispatcher, and viewer roles used by the other services.

## Routes

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/users/register` | Public; always creates a viewer |
| `POST` | `/api/users/login` | Public |
| `GET` | `/api/users/me` | Authenticated user |
| `GET` | `/api/users` | Administrator |
| `GET` | `/api/users/:id` | Same user or administrator |
| `PATCH` | `/api/users/:id` | Same user or administrator |
| `PATCH` | `/api/users/:id/role` | Administrator |

## Run it locally

Make sure MongoDB is running and create the repository-root `.env` from `.env.example`. Then start the service with:

```sh
npm run dev --workspace=@fleet/user-service
```

The service validates its configuration at startup, so a missing MongoDB URI or JWT secret produces a clear error rather than an incomplete server.

