# Deployment plan

## Recommended target

Deploy the application to one Linux virtual private server (VPS) with Docker
Compose, place Caddy in front of the application for HTTPS, and use MongoDB
Atlas (or another managed MongoDB-compatible service) for the database.

This is the simplest production shape for the current assignment-sized system:
it preserves the existing service boundaries, keeps the five backend services
private, and exposes only the frontend and API Gateway. Docker documents a
single server as the easiest Compose deployment and recommends a production
override file for environment-specific changes.

```mermaid
flowchart LR
    Browser[Browser] -->|HTTPS| Caddy[Caddy reverse proxy]
    Caddy -->|fleet.example.com| Frontend[Static React frontend]
    Caddy -->|api.fleet.example.com| Gateway[API Gateway :4000]
    Gateway --> Users[User Service]
    Gateway --> Vehicles[Vehicle Service]
    Gateway --> Telemetry[Telemetry Service]
    Gateway --> Maps[Geolocation Service]
    Gateway --> Notifications[Notification Service]
    Users --> Atlas[(Managed MongoDB)]
    Vehicles --> Atlas
    Telemetry --> Atlas
    Maps --> Atlas
    Notifications --> Atlas
    Notifications --> SMS[Twilio or SMS provider]
    Maps --> Geocoder[Production geocoder]
```

Suggested public addresses:

| Component | Address | Exposure |
|---|---|---|
| React application | `https://fleet.example.com` | Public |
| API Gateway | `https://api.fleet.example.com` | Public |
| Swagger UI | `https://api.fleet.example.com/api-docs` | Public for the demonstration, otherwise access-restricted |
| Backend services | Docker network names and ports 4001–4005 | Private |
| MongoDB | Managed database TLS endpoint | Restricted to the server/provider network |

The same design works on a university VM, DigitalOcean Droplet, Hetzner Cloud,
AWS EC2, Azure VM, or Google Compute Engine. Provider-specific pricing and UI
steps are deliberately kept outside this runbook.

## Current production gaps

Do not expose the current `docker-compose.yml` directly to the internet. It is
the local demonstration definition and currently:

- contains a known JWT secret and API key;
- always runs the demonstration seed before starting the services;
- runs MongoDB on the same host and publishes it on the loopback interface;
- uses the mock geocoder and SMS stub;
- builds the frontend with localhost API settings; and
- serves frontend assets through Vite Preview, which is a preview server rather
  than the intended production static-file server.

Before the first public deployment, add a production image target, a static
frontend server, `compose.production.yml`, a Caddy configuration, and a
sanitized `.env.production.example`. Never commit the real `.env.production`.

## Step-by-step deployment

### 1. Choose names and providers

Prepare:

- a domain with `fleet` and `api` subdomains;
- a Linux VPS with at least 2 CPU cores and 4 GB RAM for a small demonstration;
- a managed MongoDB deployment and database user;
- a supported production geocoder or self-hosted Nominatim endpoint; and
- Twilio credentials and a sender capable of messaging the administrator
  numbers, if real SMS delivery is required.

The resource size is a starting point, not a capacity guarantee. Load-test and
resize it for real vehicle volume.

### 2. Prepare DNS and the server

1. Create `A` records for `fleet.bits-pilani.in` and `api.fleet.bits-pilani.in` that
   point to the VPS IPv4 address. Create `AAAA` records only when IPv6 is
   configured on the server.
2. Install a supported Docker Engine release and the Docker Compose plugin.
3. Create a non-root deployment user with only the permissions it needs.
4. Allow inbound SSH from trusted addresses and public TCP ports 80 and 443.
   Do not expose ports 3000, 4000–4005, or 27017 publicly.
5. Enable automatic security updates and configure host-level backups or
   snapshots.

Caddy can obtain and renew public TLS certificates automatically after the DNS
records resolve, ports 80 and 443 are reachable, and its data directory is
persistent.

### 3. Create production configuration

Generate independent, random credentials. For example, generate secrets on a
trusted machine with `openssl rand -base64 48`; do not paste generated values
into chat, source control, screenshots, or logs.

The production environment must provide at least:

```dotenv
NODE_ENV=production
LOG_LEVEL=info

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/
USER_DB_NAME=fleet_users
VEHICLE_DB_NAME=fleet_vehicles
TELEMETRY_DB_NAME=fleet_telemetry
GEOLOCATION_DB_NAME=fleet_geolocation
NOTIFICATION_DB_NAME=fleet_notifications

JWT_SECRET=REPLACE_WITH_A_RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=1h
JWT_ISSUER=fleet-user-service
JWT_AUDIENCE=fleet-api
BCRYPT_ROUNDS=12

API_KEYS=REPLACE_WITH_A_RANDOM_GATEWAY_KEY
CORS_ORIGINS=https://fleet.example.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
PROXY_TIMEOUT_MS=5000

GEOCODER_PROVIDER=nominatim
NOMINATIM_BASE_URL=https://YOUR_APPROVED_GEOCODER_ENDPOINT
NOMINATIM_USER_AGENT=fleet-administration/1.0 YOUR_CONTACT
GEOCODER_TIMEOUT_MS=5000
GEOCODE_CACHE_TTL_SECONDS=86400
MAX_NEARBY_RADIUS_KM=100

SMS_PROVIDER=twilio
FLEET_ADMIN_PHONE_NUMBERS=+32470000000
SMS_TIMEOUT_MS=5000
TWILIO_ACCOUNT_SID=REPLACE_ME
TWILIO_AUTH_TOKEN=REPLACE_ME
TWILIO_FROM_NUMBER=REPLACE_ME
TWILIO_API_BASE_URL=https://api.twilio.com

VITE_API_BASE_URL=https://api.fleet.example.com
VITE_DEMO_API_KEY=REPLACE_WITH_THE_BROWSER_CLIENT_KEY
```

Set the file owner to the deployment user and mode to `600`. Prefer the cloud
provider's secret manager when one is available.

`VITE_*` values are compiled into the frontend bundle. They must therefore be
present while the image is built, and changing them requires a frontend rebuild.
Anything prefixed with `VITE_`, including the demonstration API key, is visible
to every browser user. Treat the gateway key as a client identifier and rate-
limit bucket, not as a secret or replacement for JWT authorization.

### 4. Prepare production containers

Create `compose.production.yml` as an override of the local Compose definition.
It should:

- use an immutable registry image tag such as the Git commit SHA;
- remove the local `mongodb` service and disable automatic seeding (an optional
  seed job may remain behind an explicit `demo-data` profile);
- inject configuration from the production secret store or environment file;
- publish only Caddy ports 80 and 443;
- keep the gateway, frontend, and services on a private Docker network;
- set restart policies, health checks, log rotation, and resource limits; and
- persist Caddy data so certificates survive container replacement.

Build the React application as static files and serve its `dist` directory with
Caddy or Nginx. The backend services can continue using the existing Node 22
runtime image, but a multi-stage build should omit development-only build tools
from the final image.

A minimal Caddy routing policy is conceptually:

```caddyfile
fleet.example.com {
    reverse_proxy frontend:80
}

api.fleet.example.com {
    reverse_proxy gateway:4000
}
```

The real frontend container must include single-page-application fallback so
routes such as `/vehicles` serve `index.html` instead of returning 404.

### 5. Build and publish the image

Run all checks before publishing:

```sh
npm ci
npm run ci:validate
npm test
npm run test:e2e
docker compose build
```

For a GitHub-hosted repository, GitHub Container Registry (GHCR) is a natural
choice. CI can authenticate with `GITHUB_TOKEN`, build once, and push a tag such
as `ghcr.io/OWNER/fleet-administration:<commit-sha>`. Grant the deployment host
read-only package access. Deploy a SHA tag or image digest, not mutable `latest`,
so the exact release can be reproduced and rolled back.

### 6. Start the release

On the server, clone only the deployment configuration or check out the desired
release, then authenticate to the registry and run:

```sh
docker compose \
  -f docker-compose.yml \
  -f compose.production.yml \
  --env-file .env.production \
  config --quiet

docker compose \
  -f docker-compose.yml \
  -f compose.production.yml \
  --env-file .env.production \
  pull

docker compose \
  -f docker-compose.yml \
  -f compose.production.yml \
  --env-file .env.production \
  up --detach --remove-orphans
```

These commands are the target production workflow; they will become executable
after the production override described in step 4 is added.

Do not run the demonstration seed against real production data. For a public
assignment demonstration with a new, disposable database only, retain the seed
job behind an explicit `demo-data` profile and run it once with the production
Compose files. Verify the three demo passwords were changed, then disable that
profile:

```sh
docker compose \
  -f docker-compose.yml \
  -f compose.production.yml \
  --env-file .env.production \
  --profile demo-data \
  run --rm \
  -e NODE_ENV=production \
  -e ALLOW_DEMO_SEED=true \
  seed
```

For a real fleet, create the first administrator through a dedicated one-time
bootstrap process instead.

### 7. Verify the deployment

Complete these checks before announcing the URL:

1. `https://api.fleet.example.com/health` returns success.
2. `https://api.fleet.example.com/ready` confirms all five services are ready.
3. A request without `x-api-key` is rejected and a valid key is accepted.
4. Login returns a JWT and the frontend loads without mixed-content or CORS
   errors.
5. Register and retrieve a vehicle.
6. Submit telemetry, confirm the stored location, and perform a nearby search.
7. Trigger a status change or critical event and confirm both the SMS provider
   result and notification audit record.
8. Confirm a viewer cannot delete a vehicle.
9. Open Swagger UI and exercise a harmless authenticated request.
10. Check that no service port or MongoDB port is publicly reachable.

Save screenshots only after replacing or obscuring tokens, credentials, phone
numbers, and connection strings.

### 8. Operate and recover

- Configure automated MongoDB backups and test a restore before launch.
- Send container logs to a retained log service and alert on repeated restarts,
  gateway `5xx` responses, SMS failures, and failed readiness checks.
- Monitor disk, memory, CPU, certificate renewal, database connections, and API
  latency.
- Rotate JWT, gateway, database, and Twilio credentials on a defined schedule
  and immediately after suspected exposure.
- Keep the previously deployed image tag. Roll back by setting `IMAGE_TAG` to
  that tag and running the production `up --detach` command again.
- Take a database snapshot before any backward-incompatible schema change. An
  image rollback cannot undo a data migration.

## CI/CD release sequence

Extend the existing GitHub Actions workflow only after the manual deployment is
proven:

1. Run validation, backend/frontend tests, E2E tests, and the Docker smoke test.
2. Build one image and tag it with the commit SHA.
3. Push the image to GHCR using `GITHUB_TOKEN`.
4. Require approval for the protected `production` environment.
5. Connect to the server using a narrowly scoped deployment credential.
6. Pull the approved SHA, recreate the containers, and wait for `/ready`.
7. Run a read-only production smoke test.
8. If readiness or smoke validation fails, restore the previous image tag and
   preserve logs for diagnosis.

Never expose the production `.env` as a workflow artifact. Use GitHub
environment secrets or the cloud provider's workload identity and secret
manager.

## Alternative: managed application platform

Render, Railway, Fly.io, Azure Container Apps, AWS ECS, and Google Cloud Run can
host the same services. On these platforms, deploy the frontend, gateway, and
five services separately; expose only the frontend and gateway; place all
services on a private network; and use the platform secret store. This reduces
server maintenance but introduces seven application deployments and platform-
specific networking. For the current assignment and demonstration traffic, the
single-VPS Compose path is easier to explain, reproduce, and troubleshoot.

## Completion criteria

A deployment is complete only when:

- the public site and gateway use valid HTTPS;
- backend services and the database are not public;
- local demonstration secrets have been replaced;
- frontend CORS and API URLs use the deployed domains;
- health, authentication, geolocation, notification, and RBAC checks pass;
- backups, logging, monitoring, rollback, and secret rotation are documented;
  and
- the deployed URL is added to the project README and requirements evidence.

## Official references

- [Docker: Use Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Caddy: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [GitHub: Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/)
