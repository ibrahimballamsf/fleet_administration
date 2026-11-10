import { geolocationApi, notificationApi, vehicleApi } from "./index.js";

const statuses = ["operational", "maintenance", "out_of_service", "emergency", "inactive"];

async function optionalRequest(name, request, fallback) {
  try {
    return { data: await request(), issue: null };
  } catch (error) {
    return {
      data: fallback,
      issue: { name, code: error.code, message: error.message }
    };
  }
}

export async function loadDashboard({ signal } = {}) {
  const options = { signal };
  const recentRequest = vehicleApi.list({ page: 1, pageSize: 4 }, options);
  const statusRequests = statuses.map((status) =>
    vehicleApi.list({ page: 1, pageSize: 1, status }, options)
  );
  const locationRequest = optionalRequest(
    "Live locations",
    () => geolocationApi.listLocations({ limit: 100 }, options),
    { data: [], meta: {} }
  );
  const notificationRequest = optionalRequest(
    "Critical alerts",
    () => notificationApi.list({ page: 1, pageSize: 3 }, options),
    { data: [], meta: {} }
  );

  const [recent, statusResponses, locations, notifications] = await Promise.all([
    recentRequest,
    Promise.all(statusRequests),
    locationRequest,
    notificationRequest
  ]);

  const statusCounts = Object.fromEntries(
    statuses.map((status, index) => [
      status,
      statusResponses[index].meta?.pagination?.totalItems ?? statusResponses[index].data.length
    ])
  );

  return {
    totalVehicles: recent.meta?.pagination?.totalItems ?? recent.data.length,
    vehicles: recent.data,
    statusCounts,
    locations: locations.data.data,
    notifications: notifications.data.data,
    totalNotifications: notifications.data.meta?.pagination?.totalItems ?? notifications.data.data.length,
    issues: [locations.issue, notifications.issue].filter(Boolean)
  };
}
