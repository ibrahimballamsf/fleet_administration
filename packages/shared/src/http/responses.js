function normalizeMeta(meta) {
  return meta && typeof meta === "object" ? meta : {};
}

export function successResponse(data = null, meta = {}) {
  return { data, meta: normalizeMeta(meta) };
}

export function errorResponse({ code, message, details = [], requestId }) {
  return {
    error: {
      code,
      message,
      details,
      requestId: requestId ?? null
    }
  };
}

export function sendSuccess(response, { data = null, meta = {}, statusCode = 200 } = {}) {
  return response.status(statusCode).json(successResponse(data, meta));
}

export function sendNoContent(response) {
  return response.status(204).send();
}

export function createPaginationMeta({ page, pageSize, totalItems }) {
  for (const [name, value] of Object.entries({ page, pageSize, totalItems })) {
    if (!Number.isInteger(value) || value < (name === "totalItems" ? 0 : 1)) {
      throw new TypeError(`${name} must be a valid non-negative pagination integer.`);
    }
  }

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
      hasNextPage: page < totalPages
    }
  };
}
