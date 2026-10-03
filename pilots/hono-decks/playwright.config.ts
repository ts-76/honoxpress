import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "dist/evidence/browser-tests.json" }]],
  use: { browserName: "chromium", trace: "retain-on-failure" },
  projects: [
    { name: "development", use: { baseURL: "http://127.0.0.1:5183" } },
    { name: "production-local", use: { baseURL: "http://127.0.0.1:8793" } },
  ],
  webServer: [
    { command: "pnpm dev", url: "http://127.0.0.1:5183", reuseExistingServer: false },
    { command: "pnpm preview", url: "http://127.0.0.1:8793", reuseExistingServer: false },
  ],
});
