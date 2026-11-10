# Frontend

This is the browser-based home of Fleet Administration. It gives administrators and dispatchers one place to monitor the fleet, work with vehicle records, explore locations on a map, submit test telemetry, review notifications, and manage users. The interface is built with React and Material UI and adapts to desktop and smaller screens.

## Run locally

Create the repository-root `.env` from `.env.example`, make sure the gateway and backend services are available, and then run:

```sh
npm run dev --workspace=@fleet/frontend
```

Open `http://localhost:3000` and sign in with an account from the User Service. The shared API client adds the gateway API key and JWT headers for you.

## How it talks to the backend

The modules under `src/api` provide one shared HTTP client plus service-specific methods for users, vehicles, telemetry, geolocation, and notifications. They also turn gateway failures into a consistent error shape and support abort signals when a screen is closed or refreshed.

The dashboard reads live data through the gateway for vehicle totals, operational status, current locations, recent registrations, and SMS activity. If location or notification data is unavailable, the rest of the dashboard remains useful and shows a clear partial-data warning.

## Vehicles and maps

- Vehicle management supports server-side filtering and pagination, registration, editing, operational status changes, status history, and administrator-only deletion.
- The live map uses Leaflet with OpenStreetMap tiles. It displays stored vehicle coordinates, resolves addresses through the geolocation service, and supports radius searches around an address or selected vehicle.
- Mutation controls follow the authenticated user's backend role: viewers remain read-only, dispatchers can manage records and statuses, and administrators can also delete vehicles.

## Telemetry and notifications

- The telemetry simulator submits coordinates, vehicle readings, engine condition, battery data, and critical events. It also shows the latest reading, paginated history, integration results, and the critical-event timeline.
- Notification management provides delivery filters, direct SMS dispatch, delivery-attempt details, and administrator-only retries for failed records.

## User administration

- Administrators can create viewer accounts with temporary passwords, edit contact details and SMS preferences, filter active and inactive accounts, and assign administrator, dispatcher, or viewer roles.
- Non-administrator roles receive an explicit access-restricted screen, and administrators cannot accidentally change their own role from the user table.

## Create a production build

```sh
npm run build --workspace=@fleet/frontend
```

## Run the tests

```sh
# API-client and React component tests
npm test --workspace=@fleet/frontend

# React component tests only
npm run test:frontend

# Browser tests from the repository root
npx playwright install chromium
npm run test:e2e
```

