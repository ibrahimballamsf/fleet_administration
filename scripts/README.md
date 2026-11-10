# Repository Scripts

These are the scripts i created for potential repetitive tasks like seeding data, smoke test, validating documentation and capturing demo screenshots.

- `seed-demo.mjs` This safely adds the same cross-database demonstration records every time. It won't run when in production and the value `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is deliberately set.
- `smoke-test.mjs` This checks gateway readiness, frontend availability, login, and the expected seeded record counts.
- `validate-docs.mjs` This catches broken local links in the Markdown documentation.
- `capture-demo-screenshots.mjs` creates the five screenshots required for the demonstration evidence.

The matching commands are `npm run seed`, `npm run ci:smoke`, `npm run docs:links`, and `npm run demo:capture`.
