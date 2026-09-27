import { expect, test } from '@playwright/test';

// Phase 1 smoke test: the app loads, shows a heading, and never scrolls sideways.
test('home page loads with one h1 and no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('an old Base44 lesson URL redirects to the new one', async ({ page }) => {
  await page.goto('/lesson/l6');
  await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/read$/);
  await expect(page.locator('h1')).toHaveText('Why do people build towns near rivers?');
  await expect(page).toHaveTitle('Lesson 10: Read · Thinkerwell');
});
