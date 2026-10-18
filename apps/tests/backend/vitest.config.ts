import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Load .env into process.env before test runner initializes
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    include: ["**/*.test.ts"],
    sequence: {
      shuffle: false, // Guarantees top-to-bottom test execution within each file
    },
    fileParallelism: false, // Runs test files sequentially
  },
});
