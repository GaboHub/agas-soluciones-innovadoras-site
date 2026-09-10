import { defineConfig, devices } from '@playwright/test';

const puerto = Number(process.env.E2E_PORT ?? 4321);
const urlBase = `http://localhost:${puerto}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: urlBase,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${puerto}`,
    url: urlBase,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
