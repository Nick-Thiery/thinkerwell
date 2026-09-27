import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi } from './lessonHelpers';

// Offline use (CLAUDE.md rule 2, docs/notes/phase-6.md), against the
// production build with its real service worker. playwright.config.ts
// blocks service workers for every other spec; this one needs it.
test.use({ serviceWorkers: 'allow' });

/** Waits until the service worker has stored the whole course and controls the page. */
async function waitUntilOfflineReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}

/** Every URL in the page's Cache Storage. */
async function cachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });
}

test('the service worker keeps only this site\'s own files, the whole course among them', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  await page.goto('/');
  await waitUntilOfflineReady(page);

  const urls = await cachedUrls(page);
  const foreign = urls.filter((url) => new URL(url).origin !== origin);
  expect(foreign, `Cached from other servers:\n${foreign.join('\n')}`).toEqual([]);
  expect(urls.filter((url) => /youtube|ytimg|google/.test(url))).toEqual([]);

  const paths = urls.map((url) => new URL(url).pathname);
  expect(paths).toContain('/index.html');
  // Every lesson and section check is in the content chunk.
  expect(paths.some((path) => /^\/assets\/content-[\w-]+\.js$/.test(path))).toBe(true);
  // Every lesson picture except the two small enough to be inlined into the JS.
  expect(paths.filter((path) => /^\/assets\/L\d\d-[\w-]+\.svg$/.test(path)).length).toBeGreaterThanOrEqual(20);
  expect(paths.filter((path) => path.endsWith('.woff2')).length).toBeGreaterThanOrEqual(10);
  expect(paths).toContain('/images/thinkerwell-mascot-transparent.png');
});

test('after the first visit, lessons open offline, with their pictures, and the banners say so', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await waitUntilOfflineReady(page);

  await context.setOffline(true);
  // A full page load of a lesson the learner never opened, straight from the cache.
  await page.goto('/lesson/towns-near-rivers/read');
  await expect(page.locator('h1')).toHaveText('Why do people build towns near rivers?');
  const offline = page.getByRole('status').filter({ hasText: "You're offline." });
  await expect(offline).toBeVisible();

  const picture = page.locator('.tw-lesson-visual img');
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/["']/g, ''));
  });
  expect(fontsLoaded).toContain('Funnel Display');
  expect(fontsLoaded).toContain('Atkinson Hyperlegible Next');

  // Another lesson, by address, and the course map, by link.
  await page.goto('/lesson/young-people-contribute/reflect');
  await expect(page.locator('h1')).toHaveText('How can young people contribute to their communities?');
  await page.goto('/course');
  await expect(page.locator('h1')).toHaveText('Exploring Our World');
  await expect(offline).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole('status').filter({ hasText: "You're back online." })).toBeVisible();
  await expect(offline).toHaveCount(0);
});

test('a learner keeps working offline: the dashboard says so, Watch opens on Read instead, and writing is kept', async ({
  page,
  context,
}) => {
  await addLearnerViaUi(page, 'Amina');
  await waitUntilOfflineReady(page);
  await page.goto('/');
  await expect(page.getByText('All 24 lessons work offline')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Hi Amina');
  await expect(page.getByRole('status').filter({ hasText: "You're offline. Keep going: your work is saved on this device." })).toBeVisible();

  await page.goto('/lesson/towns-near-rivers/watch');
  await expect(page.getByText("You're offline, so the video can't load now.")).toBeVisible();
  await expect(page.getByRole('article', { name: 'Ancient Mesopotamia 101' })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Keep going: this lesson is saved, and your work is saved on this device.' }),
  ).toBeVisible();

  await page.goto('/lesson/towns-near-rivers/reflect');
  const answer = page.getByRole('textbox').first();
  await answer.fill('Rivers give towns water and a way to trade.');
  await answer.blur();
  await page.reload();
  await expect(page.getByRole('textbox').first()).toHaveValue('Rivers give towns water and a way to trade.');
});
