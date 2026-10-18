import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    include: ["*.test.ts"],
    globalSetup: ["./isolated-server.ts"],
    setupFiles: ["./isolated-env.ts"],
    fileParallelism: false,
    sequence: { shuffle: false },
    testTimeout: 15000,
  },
});
