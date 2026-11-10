import { config } from "../config.js";
import { createApiClient } from "./http-client.js";
import { readSession } from "./session-storage.js";

const client = createApiClient({
  baseUrl: config.apiBaseUrl,
  apiKey: config.demoApiKey,
  getAccessToken: () => readSession()?.token
});

const resourceId = (value) => encodeURIComponent(String(value));

export const authApi = Object.freeze({
  async register(values, options = {}) {
    return client.request("api/users/register", {
      method: "POST",
      body: values,
      authenticated: false,
      ...options
    });
  },
  async login(credentials, options = {}) {
    return client.request("api/users/login", {
      method: "POST",
      body: credentials,
      authenticated: false,
      ...options
    });
  },
  async me(options = {}) {
    return client.request("api/users/me", options);
  }
});

export const userApi = Object.freeze({
  async list(query = {}, options = {}) {
    return client.request("api/users", { query, ...options });
  },
  async get(userId, options = {}) {
    return client.request(`api/users/${resourceId(userId)}`, options);
  },
  async update(userId, values, options = {}) {
    return client.request(`api/users/${resourceId(userId)}`, { method: "PATCH", body: values, ...options });
  },
  async updateRole(userId, role, options = {}) {
    return client.request(`api/users/${resourceId(userId)}/role`, { method: "PATCH", body: { role }, ...options });
  }
});

export const vehicleApi = Object.freeze({
  async list(query = {}, options = {}) {
    return client.request("api/vehicles", { query, ...options });
  },
  async create(values, options = {}) {
    return client.request("api/vehicles", { method: "POST", body: values, ...options });
  },
  async get(vehicleId, options = {}) {
    return client.request(`api/vehicles/${resourceId(vehicleId)}`, options);
  },
  async update(vehicleId, values, options = {}) {
    return client.request(`api/vehicles/${resourceId(vehicleId)}`, { method: "PATCH", body: values, ...options });
  },
  async updateStatus(vehicleId, values, options = {}) {
    return client.request(`api/vehicles/${resourceId(vehicleId)}/status`, { method: "PATCH", body: values, ...options });
  },
  async statusHistory(vehicleId, options = {}) {
    return client.request(`api/vehicles/${resourceId(vehicleId)}/status-history`, options);
  },
  async remove(vehicleId, options = {}) {
    return client.request(`api/vehicles/${resourceId(vehicleId)}`, { method: "DELETE", ...options });
  }
});

export const telemetryApi = Object.freeze({
  async submit(values, options = {}) {
    return client.request("api/telemetry", { method: "POST", body: values, ...options });
  },
  async history(vehicleId, query = {}, options = {}) {
    return client.request(`api/telemetry/vehicle/${resourceId(vehicleId)}`, { query, ...options });
  },
  async latest(vehicleId, options = {}) {
    return client.request(`api/telemetry/vehicle/${resourceId(vehicleId)}/latest`, options);
  },
  async submitEvent(vehicleId, values, options = {}) {
    return client.request(`api/telemetry/vehicle/${resourceId(vehicleId)}/events`, { method: "POST", body: values, ...options });
  },
  async events(vehicleId, options = {}) {
    return client.request(`api/telemetry/vehicle/${resourceId(vehicleId)}/events`, options);
  }
});

export const geolocationApi = Object.freeze({
  async geocode(values, options = {}) {
    return client.request("api/maps/geocode", { method: "POST", body: values, ...options });
  },
  async listLocations(query = {}, options = {}) {
    return client.request("api/maps/vehicles", { query, ...options });
  },
  async nearby(query, options = {}) {
    return client.request("api/maps/vehicles/nearby", { query, ...options });
  },
  async getLocation(vehicleId, options = {}) {
    return client.request(`api/maps/vehicles/${resourceId(vehicleId)}/location`, options);
  },
  async updateLocation(vehicleId, values, options = {}) {
    return client.request(`api/maps/vehicles/${resourceId(vehicleId)}/location`, { method: "PUT", body: values, ...options });
  },
  async nearbyVehicle(vehicleId, query, options = {}) {
    return client.request(`api/maps/vehicles/${resourceId(vehicleId)}/nearby`, { query, ...options });
  }
});

export const notificationApi = Object.freeze({
  async send(values, options = {}) {
    return client.request("api/notifications/send", { method: "POST", body: values, ...options });
  },
  async list(query = {}, options = {}) {
    return client.request("api/notifications", { query, ...options });
  },
  async get(notificationId, options = {}) {
    return client.request(`api/notifications/${resourceId(notificationId)}`, options);
  },
  async retry(notificationId, options = {}) {
    return client.request(`api/notifications/${resourceId(notificationId)}/retry`, { method: "POST", ...options });
  }
});

export { ApiError, createApiClient } from "./http-client.js";
