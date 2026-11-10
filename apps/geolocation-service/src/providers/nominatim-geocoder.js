import { NotFoundError, ServiceUnavailableError } from "@fleet/shared/http";

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createNominatimGeocoder({
  baseUrl,
  userAgent,
  timeoutMs,
  minimumIntervalMs = 1000,
  fetchImplementation = fetch
}) {
  let nextRequestAt = 0;
  let requestQueue = Promise.resolve();

  async function performRequest(address) {
    const waitTime = Math.max(0, nextRequestAt - Date.now());
    if (waitTime) await wait(waitTime);
    nextRequestAt = Date.now() + minimumIntervalMs;

    const parameters = new URLSearchParams({
      q: address,
      format: "jsonv2",
      limit: "1"
    });
    const url = `${baseUrl.replace(/\/$/, "")}/search?${parameters}`;

    let response;
    try {
      response = await fetchImplementation(url, {
        headers: { "user-agent": userAgent, accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      throw new ServiceUnavailableError("The geocoding provider is unavailable", { cause: error });
    }

    if (!response.ok) {
      throw new ServiceUnavailableError(`The geocoding provider returned HTTP ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new NotFoundError("The address could not be geocoded");
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ServiceUnavailableError("The geocoding provider returned invalid coordinates");
    }

    return {
      latitude,
      longitude,
      displayName: results[0].display_name,
      provider: "nominatim",
      providerPlaceId: String(results[0].place_id),
      attribution: "© OpenStreetMap contributors"
    };
  }

  return Object.freeze({
    geocode(address) {
      const result = requestQueue.then(() => performRequest(address));
      requestQueue = result.catch(() => undefined);
      return result;
    }
  });
}
