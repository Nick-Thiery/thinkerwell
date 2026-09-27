import { defineConfig, devices } from '@playwright/test';

// Checks the dev-only /dev/* routes (see src/app/routes.tsx), which exist
// only when Vite runs in dev mode (import.meta.env.DEV) — unlike
// playwright.config.ts, this runs against `vite` itself, not a production
// build + preview. Kept separate so the production e2e run (npm run
// test:e2e) never depends on dev-only pages, and vice versa.
const PORT = 4318;
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e-dev',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // PW_CHROMIUM_PATH lets a machine without Playwright's own browser download
    // (for example a locked-down cloud runner) use an installed Chromium instead.
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: `npx vite --port ${PORT} --strictPort`,
          port: PORT,
          reuseExistingServer: false,
          timeout: 60_000,
        },
      }),
});
