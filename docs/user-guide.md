# User guide

## Sign in

1. Start the application with `npm run docker:up`.
2. Open http://localhost:3000.
3. Sign in with a seeded account. For full access use `admin@fleet.test` and `FleetDemo123!`.

The browser stores the current demonstration session locally. Signing out removes it. The API key included in the frontend is for local coursework demonstration only and is not a production secret.

## Role permissions

| Capability | Administrator | Dispatcher | Viewer |
|---|:---:|:---:|:---:|
| View dashboard, vehicles, telemetry, and map | Yes | Yes | Yes |
| Register and update vehicles | Yes | Yes | No |
| Change vehicle operational status | Yes | Yes | No |
| Delete a vehicle | Yes | No | No |
| Submit telemetry or critical events | Yes | Yes | No |
| Store authoritative vehicle coordinates | Yes | Yes | No |
| View and send notifications | Yes | Yes | No |
| Retry a failed SMS | Yes | No | No |
| Edit own profile and notification preferences | Yes | Yes | Yes |
| View all users and change roles | Yes | No | No |

## Dashboard

The dashboard summarizes fleet size, operational states, recent notifications, current locations, and recently updated vehicles. Use it as the starting point for investigating an emergency or maintenance condition.

## Vehicles

Use **Vehicles** to filter and inspect fleet records. Administrators and dispatchers can register vehicles, edit details, and change operational status. A status change appends history and triggers an SMS notification. Only administrators can permanently delete a vehicle.

## Live map and nearby search

Use **Live map** to view current vehicle markers. Search from entered coordinates or from a selected vehicle and choose a radius in kilometres. Results are ordered by distance. Coordinates are displayed as latitude and longitude in the UI but stored as GeoJSON `[longitude, latitude]`.

## Telemetry simulator

Administrators and dispatchers can select a vehicle and submit speed, battery, engine condition, odometer, coordinates, and an optional event. A low battery, engine fault, or emergency stop creates a critical event and triggers notification processing. The reading remains stored even when a downstream integration reports a failure.

## Notifications

Administrators and dispatchers can inspect SMS state and delivery attempts. Records show pending, sent, or failed status. Administrators can retry failed messages; every retry creates a new attempt rather than overwriting the audit history.

## Users and roles

All users can maintain their own profile and SMS preferences. Administrators can list users, create viewer accounts, edit user profiles, and assign administrator, dispatcher, or viewer access.

## Sign out

Use the account menu in the application header and select **Sign out**. For shared demonstration machines, close the browser after signing out.
