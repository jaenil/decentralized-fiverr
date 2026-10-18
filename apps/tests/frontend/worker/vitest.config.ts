import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      next: fileURLToPath(
        new URL(
          "../../../workers-frontend/node_modules/next/",
          import.meta.url,
        ),
      ),
      "@": fileURLToPath(
        new URL("../../../workers-frontend/", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["../shared/setup.ts"],
    include: ["components/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
  },
});
