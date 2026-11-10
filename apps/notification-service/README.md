# Notification Service

The Notification Service handles the full SMS lifecycle: accepting a message request, sending it through the configured provider, recording whether it succeeded, and retrying failed deliveries. Those records make it possible to test notification flows without relying on a real phone for every run.

## Routes

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/notifications/send` | Administrator or dispatcher |
| `GET` | `/api/notifications` | Administrator or dispatcher |
| `GET` | `/api/notifications/:id` | Administrator or dispatcher |
| `POST` | `/api/notifications/:id/retry` | Administrator |

The default stub provider can be placed in deterministic `success` or `failure` mode. This is useful for local demonstrations and tests. An event addressed to fleet administrators is expanded to every number in `FLEET_ADMIN_PHONE_NUMBERS`, with a separate notification and delivery-attempt record for each recipient.

For real messages, switch to the optional Twilio adapter. It calls the Messages REST resource using Basic authentication and form-encoded `To`, `From`, and `Body` fields. Keep in mind that Twilio trial accounts can send only to verified recipients.

