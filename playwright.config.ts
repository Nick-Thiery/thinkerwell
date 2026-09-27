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
    // The production build registers a service worker that downloads the
    // whole course in the background. Most specs don't need it (and a page
    // it controls answers from its cache, out of reach of page.route), so
    // it is blocked here; e2e/offline.spec.ts turns it back on.
    serviceWorkers: 'block',
    // PW_CHROMIUM_PATH lets a machine without Playwright's own browser download
    // (for example a locked-down cloud runner) use an installed Chromium instead.
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  // Tests tagged @own-size set their own window sizes (e2e/no-sideways-scroll.spec.ts
  // checks six widths, for example), so running them in every project would only
  // repeat them. They run in the laptop project.
  projects: [
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
      grepInvert: /@own-size/,
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
      grepInvert: /@own-size/,
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
