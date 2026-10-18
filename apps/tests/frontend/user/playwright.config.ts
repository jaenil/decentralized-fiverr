import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  outputDir: "../../test-results/user",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../playwright-report/user" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3001",
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
    command: "npm run dev -- --hostname 127.0.0.1",
    cwd: fileURLToPath(new URL("../../../user-frontend/", import.meta.url)),
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXT_PUBLIC_BACKEND_URL: "http://127.0.0.1:3999" },
  },
});
