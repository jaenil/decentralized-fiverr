import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.WORKER_E2E_PORT ?? "3002");
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  outputDir: "../../test-results/worker",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../playwright-report/worker" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    cwd: fileURLToPath(new URL("../../../workers-frontend/", import.meta.url)),
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXT_PUBLIC_BACKEND_URL: "http://127.0.0.1:3999", WORKER_E2E: "1" },
  },
});
