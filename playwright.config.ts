import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'dist/evidence/browser-tests.json' }]],
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  projects: [
    { name: 'development', use: { baseURL: 'http://127.0.0.1:5173' } },
    { name: 'production-local', use: { baseURL: 'http://127.0.0.1:8787' } },
  ],
  webServer: [
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
    { command: 'npm run preview', url: 'http://127.0.0.1:8787', reuseExistingServer: false },
  ],
})
