export function createReadinessHandler({ services, fetchImplementation = fetch, timeoutMs = 2000 }) {
  return async function readiness(_request, response) {
    const checks = await Promise.all(
      Object.entries(services).map(async ([name, baseUrl]) => {
        try {
          const healthResponse = await fetchImplementation(new URL("/health", baseUrl), {
            signal: AbortSignal.timeout(timeoutMs)
          });
          return [name, { status: healthResponse.ok ? "available" : "unavailable" }];
        } catch {
          return [name, { status: "unavailable" }];
        }
      })
    );
    const serviceStatus = Object.fromEntries(checks);
    const ready = Object.values(serviceStatus).every((service) => service.status === "available");
    return response.status(ready ? 200 : 503).json({
      data: { service: "gateway", status: ready ? "ready" : "degraded", services: serviceStatus },
      meta: {}
    });
  };
}
