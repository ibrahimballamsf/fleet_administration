import { NotFoundError, ServiceUnavailableError } from "@fleet/shared/http";

export async function requestJson(url, { method = "GET", body, context, timeoutMs = 5000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        ...(context?.accessToken ? { authorization: `Bearer ${context.accessToken}` } : {}),
        ...(context?.requestId ? { "x-request-id": context.requestId } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    throw new ServiceUnavailableError("A downstream service is unavailable", { cause: error });
  }

  if (response.status === 404) throw new NotFoundError("Vehicle not found");
  if (!response.ok) {
    throw new ServiceUnavailableError(`A downstream service returned HTTP ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}
