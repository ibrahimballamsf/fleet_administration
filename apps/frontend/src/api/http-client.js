export class ApiError extends Error {
  constructor({ message, status = 0, code = "NETWORK_ERROR", details = [], requestId = null, cause }) {
    super(message, cause ? { cause } : undefined);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function appendQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
    else url.searchParams.set(key, String(value));
  }
}

function errorFromResponse(response, payload) {
  const apiError = payload?.error;
  return new ApiError({
    message: apiError?.message || `Request failed with status ${response.status}`,
    status: response.status,
    code: apiError?.code || "HTTP_ERROR",
    details: Array.isArray(apiError?.details) ? apiError.details : [],
    requestId: apiError?.requestId || response.headers.get("x-request-id")
  });
}

export function createApiClient({ baseUrl, apiKey, getAccessToken, fetchImplementation = fetch }) {
  if (!baseUrl || !apiKey) throw new TypeError("baseUrl and apiKey are required");

  async function request(path, { method = "GET", query, body, signal, authenticated = true } = {}) {
    const accessToken = getAccessToken?.();
    if (authenticated && !accessToken) {
      throw new ApiError({
        message: "Sign in to continue",
        status: 401,
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const url = new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
    appendQuery(url, query);
    const headers = { Accept: "application/json", "X-API-Key": apiKey };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await fetchImplementation(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new ApiError({
        message: "The Fleet API could not be reached",
        code: "NETWORK_ERROR",
        cause: error
      });
    }

    if (response.status === 204) return { data: null, meta: {} };
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) throw errorFromResponse(response, payload);
    return payload;
  }

  return Object.freeze({ request });
}
