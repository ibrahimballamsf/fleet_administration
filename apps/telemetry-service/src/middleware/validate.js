export function validateRequest(schemas) {
  return function validate(request, _response, next) {
    const validated = {};
    for (const location of ["params", "query", "body"]) {
      if (!schemas[location]) continue;
      const result = schemas[location].safeParse(request[location]);
      if (!result.success) return next(result.error);
      validated[location] = result.data;
    }
    request.validated = validated;
    return next();
  };
}
