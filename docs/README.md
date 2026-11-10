# Project documentation

Whether you are trying the application for the first time, looking for an API route, or preparing a deployment, the guides below should get you to the right place quickly. Start with **Local startup** to run the system or **Architecture** to understand how the pieces fit together.

| Document | Purpose |
|---|---|
| [Local startup](local-startup.md) | Docker and direct Node startup instructions |
| [Deployment plan](deployment.md) | Production topology, hardening, release, verification, and rollback |
| [Configuration](configuration.md) | Environment variables, providers, and secret handling |
| [User guide](user-guide.md) | Frontend workflows and role permissions |
| [API guide](api-guide.md) | Authentication, common requests, and API discovery |
| [OpenAPI specification](openapi.yaml) | Complete machine-readable API contract |
| [HTTP conventions](http-conventions.md) | Shared envelopes, errors, request IDs, and status codes |
| [Data model](data-model.md) | Database ownership, collections, GeoJSON, and indexes |
| [Testing](testing.md) | Unit, integration, frontend, E2E, and CI validation |
| [Demonstration](demonstration.md) | Seeded scenario and presentation walkthrough |
| [Troubleshooting](troubleshooting.md) | Common startup, configuration, browser, and CI failures |
| [Requirements traceability](requirements-traceability.md) | Assignment requirements mapped to implementation evidence |
| [Screenshot evidence](screenshots/README.md) | Required capture list and file naming |

## Explore the API in your browser

With the stack running, open http://localhost:4000/api-docs for Swagger UI. The same contract is available as JSON at http://localhost:4000/api-docs/openapi.json.

Before committing documentation changes, validate the OpenAPI contract and local links with:

```sh
npm run docs:validate
npm run docs:links
```
