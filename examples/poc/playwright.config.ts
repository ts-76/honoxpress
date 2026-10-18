import { defineConfig } from "@playwright/test";

const devPort = process.env.HONOXPRESS_TEST_DEV_PORT ?? "5173";
const workerPort = process.env.HONOXPRESS_TEST_WORKER_PORT ?? "8787";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "dist/evidence/browser-tests.json" }]],
  use: {
    browserName: "chromium",
    trace: "retain-on-failure",
    launchOptions: process.env.HONOXPRESS_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.HONOXPRESS_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  projects: [
    { name: "development", use: { baseURL: `http://127.0.0.1:${devPort}` } },
    { name: "production-local", use: { baseURL: `http://127.0.0.1:${workerPort}` } },
  ],
  webServer: [
    {
      command: `pnpm dev --port ${devPort}`,
      url: `http://127.0.0.1:${devPort}`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm preview --port ${workerPort}`,
      url: `http://127.0.0.1:${workerPort}`,
      reuseExistingServer: false,
    },
  ],
});
