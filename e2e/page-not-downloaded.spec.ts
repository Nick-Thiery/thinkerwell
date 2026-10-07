import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow } from './lessonHelpers';
import { courseLessons } from './pageTour';
import { uiText } from './uiText';

// A first visit that loses the connection after the home page shows but
// before the service worker has stored the course (docs/notes/slow-internet.md):
// a lesson's code (the lessonPages chunk) can't be downloaded. The page says
// so calmly, under the header, with "Try again" and a way home, instead of
// "Something went wrong" (src/app/lazyPage.tsx). playwright.config.ts
// blocks the service worker, so here it never gets to store the course:
// the moment before it has finished.

const ui = uiText();
const LESSON_CHUNK = /\/assets\/lessonPages-[\w-]+\.js$/;
/** Lesson 1: on the course map's first screen at every size (a phone shows one section at a time). */
const L1 = courseLessons[0]!;
const L1_READ = `/lesson/${L1.id}/read`;

/** Home, then the course map through the header's menu, as a learner would get there. */
async function openCourseFromHome(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: ui('ds.chrome.siteHeader.openMenu') });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: ui('nav.label') }).getByRole('link', { name: ui('nav.course') }).click();
  await expect(page.locator('h1')).toHaveText('Exploring Our World');
}

/** Colours in the message that are red (strong red, weak green and blue), as CSS computes them. */
async function redIn(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluate((root) => {
    const red: string[] = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const style = getComputedStyle(el);
      for (const colour of [style.color, style.backgroundColor, style.borderTopColor, style.outlineColor]) {
        const [r = 0, g = 0, b = 0, a = 1] = (colour.match(/[\d.]+/g) ?? []).map(Number);
        if (a > 0 && r > 150 && g < 110 && b < 110) red.push(`${el.tagName.toLowerCase()}: ${colour}`);
      }
    }
    return red;
  });
}

test("a lesson whose code hasn't downloaded says so, and Try again opens it once the connection is back", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(ui('pages.home.title'));

  // The connection drops: the lesson's code can't be fetched.
  let blocked = 0;
  await page.route(LESSON_CHUNK, (route) => {
    blocked += 1;
    return route.abort('internetdisconnected');
  });
  await openCourseFromHome(page);
  await page.locator(`a[href="${L1_READ}"]`).first().click();

  await expect(page.locator('h1')).toHaveText(ui('pageNotDownloaded.title'));
  expect(blocked).toBeGreaterThan(0);
  await expect(page).toHaveURL(new RegExp(`${L1_READ}$`));
  await expect(page).toHaveTitle(`${ui('pageNotDownloaded.title')} | Thinkerwell`);
  await expect(page.getByText(ui('pageNotDownloaded.body'))).toBeVisible();
  await expect(page.getByText(ui('routeError.title'))).toHaveCount(0);
  // The header stays: every page already downloaded is a tap away.
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: ui('pageNotDownloaded.home') })).toHaveAttribute('href', '/');
  const retry = page.getByRole('button', { name: ui('pageNotDownloaded.retry') });
  await expect(retry).toBeVisible();
  const size = await retry.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(44);
  expect(await redIn(page, '.tw-not-downloaded')).toEqual([]);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice']).analyze();
  expect(axe.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);

  // The connection is back.
  await page.unroute(LESSON_CHUNK);
  await retry.click();
  await expect(page.locator('h1')).toHaveText(L1.title);
  await expect(page).toHaveURL(new RegExp(`${L1_READ}$`));
});

test('with the connection still gone, Try again says so and stays on the page', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(ui('pages.home.title'));
  await page.route(LESSON_CHUNK, (route) => route.abort('internetdisconnected'));
  await openCourseFromHome(page);
  await page.locator(`a[href="${L1_READ}"]`).first().click();
  await expect(page.locator('h1')).toHaveText(ui('pageNotDownloaded.title'));

  await context.setOffline(true);
  await page.getByRole('button', { name: ui('pageNotDownloaded.retry') }).click();
  await expect(page.getByRole('status').filter({ hasText: ui('pageNotDownloaded.stillOffline') })).toBeVisible();
  await expect(page.locator('h1')).toHaveText(ui('pageNotDownloaded.title'));
  await context.setOffline(false);
});
