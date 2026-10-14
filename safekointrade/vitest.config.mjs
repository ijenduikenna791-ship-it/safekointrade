import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside a React Server environment; tests run in Node.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.js", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{js,jsx}", "tests/integration/**/*.test.js"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: ["./tests/setup.js"],
  },
});
