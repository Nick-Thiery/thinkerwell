import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a production build served by `vite preview`.
// Set E2E_BASE_URL to test a server you started yourself (for example on your
// own port); then Playwright doesn't build or start one.
const PORT = 4317;
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
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
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
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
          command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
          port: PORT,
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
});
