import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3199",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "JOB_HUNTER_DATA_DIR=/private/tmp/job-hunter-e2e npm run dev -- --port 3199",
    url: "http://127.0.0.1:3199",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
