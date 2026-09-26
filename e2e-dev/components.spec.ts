import { expect, test } from '@playwright/test';

// Dev only (see playwright.dev.config.ts and src/app/routes.tsx): checks that
// /dev/components — the design-system component gallery — renders cleanly at
// phone and laptop widths, with no console errors and no horizontal scroll.
// This does not run as part of `npm run test:e2e` (the production build has
// no /dev/* routes at all); it has its own script, test:e2e:dev.

test('renders at 390 and 1280px with no horizontal scroll and no console errors', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/dev/components');
  // A cold Vite dependency cache re-optimizes lucide-react on first request
  // and reloads the page once; give that more room than the default 5s.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll, `horizontal scroll at ${testInfo.project.name}`).toBe(false);
  expect(consoleErrors, 'console errors').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});
