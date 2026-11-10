# Telemetry Service

The Telemetry Service receives readings from vehicles and turns them into useful fleet history. It stores the latest and historical readings, records vehicle events, and identifies critical conditions such as a low battery, engine fault, or emergency stop.

## Routes

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/telemetry` | Administrator or dispatcher |
| `GET` | `/api/telemetry/vehicle/:vehicleId` | Authenticated user |
| `GET` | `/api/telemetry/vehicle/:vehicleId/latest` | Authenticated user |
| `POST` | `/api/telemetry/vehicle/:vehicleId/events` | Administrator or dispatcher |
| `GET` | `/api/telemetry/vehicle/:vehicleId/events` | Authenticated user |

A valid telemetry reading is stored before the service updates location data, refreshes the vehicle summary, or sends notifications. If one of those follow-up integrations fails, the API reports that failure without throwing away the reading that was already accepted.

