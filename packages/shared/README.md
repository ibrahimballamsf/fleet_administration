# Shared Package

This small package keeps the gateway and backend services consistent without coupling their business logic. It provides the configuration loader and common HTTP behavior that every service needs. Database models and service-specific rules deliberately stay with the service that owns them.

## What it exports

- `@fleet/shared/config` — reads environment variables and reports useful validation errors at startup.
- `@fleet/shared/http` — supplies response envelopes, operational errors, request IDs, and shared error middleware.

If a change is useful to only one service, keep it out of this package. Shared code should describe a genuine cross-service contract rather than become a shortcut for unrelated helpers.
