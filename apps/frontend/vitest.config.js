import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://localhost:4000"),
    "import.meta.env.VITE_DEMO_API_KEY": JSON.stringify("frontend-test-key")
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    restoreMocks: true,
    clearMocks: true
  }
});
