# Geolocation Service

The Geolocation Service turns addresses into coordinates, keeps the latest known location for each vehicle, and finds vehicles near a chosen point. Keeping this work in one service also gives the application one place to manage geocoder limits and caching.

## Routes

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/maps/geocode` | Authenticated user |
| `GET` | `/api/maps/vehicles` | Authenticated user |
| `GET` | `/api/maps/vehicles/nearby` | Authenticated user |
| `PUT` | `/api/maps/vehicles/:vehicleId/location` | Administrator or dispatcher |
| `GET` | `/api/maps/vehicles/:vehicleId/location` | Authenticated user |
| `GET` | `/api/maps/vehicles/:vehicleId/nearby` | Authenticated user |

Local development uses the mock provider by default. It always returns the same Brussels, Antwerp, and Ghent results, which keeps demonstrations and tests predictable.

When Nominatim is enabled, the adapter sends a custom User-Agent, caches responses, processes requests one at a time, and stays within one request per second. Do not use the public `nominatim.openstreetmap.org` instance for production fleet tracking. Choose a self-hosted Nominatim installation or a commercial geocoding provider instead.

