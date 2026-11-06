# Shared Package

Framework-agnostic configuration and HTTP contracts shared by the gateway and backend services. Service-specific business logic and database models must remain in their owning service.

Exports:

- `@fleet/shared/config` — environment parsing and validation.
- `@fleet/shared/http` — response envelopes, operational errors, request IDs, and error middleware.
