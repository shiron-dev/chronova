import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
  },
  webServer: [
    {
      command: 'cd ../backend && go run ./cmd/server -addr :8080 -db ./e2e.db',
      url: 'http://localhost:8080/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
