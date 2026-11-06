# Database ownership and data model

Each backend service owns its MongoDB database and collections. Services exchange identifiers and data through HTTP APIs; they do not read or join another service's collections. Local development may use one MongoDB server, but each service selects its own database name.

## Ownership

| Service | Database | Collections |
|---|---|---|
| User Service | `fleet_users` | `users` |
| Vehicle Service | `fleet_vehicles` | `vehicles`, `vehiclestatushistories` |
| Telemetry Service | `fleet_telemetry` | `telemetries`, `vehicleevents` |
| Geolocation Service | `fleet_geolocation` | `vehiclelocations`, `geocodecaches` |
| Notification Service | `fleet_notifications` | `notifications`, `notificationattempts` |

The exact database names are configurable. Cross-service identifiers such as `vehicleId`, `recipientUserId`, and `notificationId` are strings unless the referenced document belongs to the same service database.

## Location representation

Coordinates use GeoJSON `Point` values with the mandatory ordering `[longitude, latitude]`:

```json
{
  "type": "Point",
  "coordinates": [4.3517, 50.8503]
}
```

The Geolocation Service is the authoritative owner of current vehicle positions. Its `vehiclelocations.location` field has a MongoDB `2dsphere` index. The Vehicle Service stores only a latest-location summary for efficient vehicle detail responses.

## History and audit records

- Vehicle status changes are appended to `vehiclestatushistories`.
- Every telemetry submission is retained in `telemetries`.
- Classified critical events are retained separately in `vehicleevents`.
- Notification state is stored in `notifications` and each delivery attempt is appended to `notificationattempts`.
- Cached geocoding entries expire through a TTL index on `expiresAt`.

## Indexing

Unique indexes protect user emails, vehicle registration numbers, VINs when supplied, vehicle location ownership, geocode query hashes, and notification attempt numbers. Compound indexes support vehicle history, time-ordered telemetry, event filtering, notification filtering, and status filtering.

Mongoose schema validation provides application-level checks, while MongoDB indexes provide database-level uniqueness and geospatial behavior. Integration tests against MongoDB will verify index enforcement in the testing phase.
