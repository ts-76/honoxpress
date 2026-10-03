import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/hmr",
  outputDir: "test-results/hmr",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["json", { outputFile: "dist/evidence/hmr-tests.json" }]],
  use: { baseURL: "http://127.0.0.1:5195", trace: "retain-on-failure" },
  webServer: {
    command: "node tests/start-hmr.mjs",
    url: "http://127.0.0.1:5195",
    reuseExistingServer: false,
  },
});
