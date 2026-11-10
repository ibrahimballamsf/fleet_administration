# Demonstration

Start the seeded stack with `npm run docker:up`, then sign in at http://localhost:3000 using `admin@fleet.test` and `FleetDemo123!`.

## Seeded scenario

The demonstration seed creates three roles, five Belgian fleet vehicles, five current locations, ten telemetry readings, three critical events, four SMS notifications, delivery attempts, and vehicle status history. It intentionally includes operational, maintenance, out-of-service, and emergency vehicles plus one failed SMS record.

## Suggested walkthrough

1. **Dashboard:** show fleet totals, operational distribution, recent notifications, current locations, and recent vehicles.
2. **Vehicle management:** filter by status, inspect status history, and change a vehicle status to demonstrate automatic notification generation.
3. **Live map:** display the seeded vehicle markers and run a nearby search around Brussels or a selected vehicle.
4. **Telemetry:** select `BE-214-XF`, submit a reading, then trigger an engine fault or emergency stop and show the resulting critical event.
5. **Notifications:** inspect delivery attempts and retry the pre-seeded failed low-battery SMS.
6. **Users and roles:** show administrator, dispatcher, and viewer accounts and the role-management controls.
7. **API Gateway:** compare the following requests to demonstrate API-key verification:

   ```sh
   curl -i http://localhost:4000/api/vehicles
   curl -i -H 'X-API-Key: development-api-key' http://localhost:4000/api/vehicles
   ```

   The second protected request also needs a JWT for a successful service response, while the first is rejected by the gateway before routing.

8. **Swagger UI:** open http://localhost:4000/api-docs and show request models, JWT/API-key requirements, examples, and error responses.

The captured submission evidence and reproducible capture command are documented in [`screenshots/README.md`](screenshots/README.md).

