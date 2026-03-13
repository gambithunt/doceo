import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5187';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: 'list',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium-local',
      use: {
        browserName: 'chromium'
      }
    }
  ]
});
