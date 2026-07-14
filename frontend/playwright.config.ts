import { defineConfig } from '@playwright/test'

// ローカルではプリインストールのChromiumを使い、CIではPlaywright標準の解決に任せる。
// PLAYWRIGHT_CHROMIUM_PATH が指定されていればそれを優先する。
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  webServer: [
    {
      // e2eは使い捨てDBで起動する。global-setup が起動前に削除するので毎回決定的にシードされる。
      command: 'cd ../backend && go run ./cmd/server -addr :8080 -db ./e2e.db',
      url: 'http://localhost:8080/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
