import { defineConfig, devices } from '@playwright/test';

const puerto = Number(process.env.E2E_PORT ?? 4321);
const urlBase = `http://localhost:${puerto}`;
const puertoGa4 = Number(process.env.E2E_PORT_GA4 ?? 4322);
const urlGa4 = `http://localhost:${puertoGa4}`;
const soloAnalitica = '**/spec/analitica/**';

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
      testIgnore: soloAnalitica,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testIgnore: soloAnalitica,
    },
    {
      name: 'ga4',
      use: { ...devices['Desktop Chrome'], baseURL: urlGa4 },
      testMatch: '**/spec/analitica/**/*.spec.ts',
    },
  ],
  webServer: [
    {
      command: `PUBLIC_GA4_ID= npm run build && npm run preview -- --port ${puerto}`,
      url: urlBase,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
    },
    {
      command: `PUBLIC_GA4_ID=G-TEST AGAS_OUT_DIR=dist-ga4 npm run build && AGAS_OUT_DIR=dist-ga4 npm run preview -- --port ${puertoGa4}`,
      url: urlGa4,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
    },
  ],
});
