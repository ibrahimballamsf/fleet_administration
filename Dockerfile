FROM node:22-bookworm-slim

WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/geolocation-service/package.json ./apps/geolocation-service/package.json
COPY apps/notification-service/package.json ./apps/notification-service/package.json
COPY apps/telemetry-service/package.json ./apps/telemetry-service/package.json
COPY apps/user-service/package.json ./apps/user-service/package.json
COPY apps/vehicle-service/package.json ./apps/vehicle-service/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
COPY scripts ./scripts
COPY .env.example ./

RUN npm run build --workspace=@fleet/frontend

# Vite bundles its config into this cache directory when the preview server starts.
# Keep the runtime unprivileged while allowing that single cache location to be written.
RUN mkdir -p /app/node_modules/.vite-temp \
  && chown -R node:node /app/node_modules/.vite-temp

USER node
CMD ["npm", "run", "start", "--workspace=@fleet/gateway"]
