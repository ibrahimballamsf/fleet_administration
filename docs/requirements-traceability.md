# Requirements traceability

| Requirement | Implementation | Verification or evidence |
|---|---|---|
| Address geocoding | Geolocation provider adapter with mock and Nominatim implementations | Geolocation integration and unit tests; Swagger `POST /api/maps/geocode` |
| Store GPS coordinates | Authoritative `vehiclelocations` collection with GeoJSON points | Map UI, data-model documentation, telemetry synchronization tests |
| Nearby vehicle search | MongoDB `2dsphere` query by coordinates or selected vehicle | Swagger nearby routes, mocked geolocation tests, demonstration walkthrough |
| Map interface | React Leaflet map with current markers and radius search | Frontend map screen and screenshot checklist |
| Critical-event SMS | Telemetry event classification calling Notification Service | Low-battery, engine-fault, and emergency-stop service-integration tests |
| Operational-status SMS | Vehicle status changes call Notification Service | Vehicle integration tests and seeded status history |
| Sent/failed audit | Notification and notification-attempt records with retry | Notification tests and management screen |
| Gateway routing | Express proxies for users, vehicles, telemetry, maps, notifications | Gateway integration tests and `/ready` checks |
| API-key verification | Gateway middleware before service routing | Missing/invalid-key tests and demonstration command |
| Rate limiting | Per-validated-key gateway rate limiter | Gateway integration and unit tests |
| Service-unavailable handling | Proxy timeout and consistent `503` error | Gateway unavailable-target test |
| OpenAPI documentation | OpenAPI 3.0.3 specification and Swagger UI | `npm run docs:validate`; 24 documented paths |
| JWT authentication | User login and shared JWT verification | User integration/unit tests and E2E login flow |
| Role-based access | Admin, dispatcher, and viewer middleware policies | Vehicle-delete and user-role tests; user-guide matrix |
| Automated backend tests | Mocha/Chai plus Node HTTP/model tests | `npm test` and CI test job |
| Frontend tests | Vitest, Testing Library, API-client tests | Frontend test job within `npm test` |
| End-to-end tests | Playwright with deterministic mock gateway | `npm run test:e2e` and CI browser job |
| Seed data | Idempotent cross-database demonstration seed | `npm run seed`; Docker smoke count checks |
| Local startup | One reusable app image and Docker Compose orchestration | `npm run docker:up`; Docker CI smoke job |
| CI validation | Four GitHub Actions jobs | Validate/build, tests, E2E artifacts, Docker smoke and failure logs |
