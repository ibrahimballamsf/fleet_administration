import SwaggerParser from "@apidevtools/swagger-parser";
import { loadOpenApiDocument } from "./openapi.js";

try {
  const document = await loadOpenApiDocument();
  await SwaggerParser.validate(document);
  console.log(`OpenAPI ${document.openapi} document is valid (${Object.keys(document.paths).length} paths)`);
} catch (error) {
  console.error("OpenAPI validation failed", error.message);
  process.exit(1);
}
