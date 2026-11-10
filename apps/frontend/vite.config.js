import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function rootFrontendEnvironment() {
  let source = "";
  try {
    source = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  } catch {
    source = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
  }
  const fileEnvironment = Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter((line) => line.startsWith("VITE_") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2")];
      })
  );
  const processEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => key.startsWith("VITE_") && value !== undefined)
  );
  return { ...fileEnvironment, ...processEnvironment };
}

export default defineConfig(() => {
  const frontendEnvironment = rootFrontendEnvironment();
  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(frontendEnvironment.VITE_API_BASE_URL),
      "import.meta.env.VITE_DEMO_API_KEY": JSON.stringify(frontendEnvironment.VITE_DEMO_API_KEY)
    },
    server: { host: "localhost", port: 3000 },
    preview: { host: "localhost", port: 3000 }
  };
});
