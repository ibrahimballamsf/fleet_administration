# User Service

Owns user accounts, password authentication, JWT issuance, user profiles, and role-based access control.

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

Run with `npm run dev --workspace=@fleet/user-service`. MongoDB and the variables documented in the repository `.env.example` are required.

