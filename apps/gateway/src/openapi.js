import { readFile } from "node:fs/promises";
import YAML from "yaml";

const openApiPath = new URL("../../../docs/openapi.yaml", import.meta.url);

export async function loadOpenApiDocument() {
  return YAML.parse(await readFile(openApiPath, "utf8"));
}

export { openApiPath };
