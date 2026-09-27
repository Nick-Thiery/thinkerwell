import { expect, test, type Page } from '@playwright/test';

// CLAUDE.md rule 1: no third-party requests of any kind (fonts, analytics,
// trackers). Every request the app makes must go to its own origin.
const routes = [
  '/',
  '/course',
  '/journal',
  '/educators',
  '/about',
  '/lesson/l6',
  '/lesson/towns-near-rivers/watch',
  '/section/civics/check',
  '/whatever',
];

function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

function isOwnOrigin(url: string, origin: string): boolean {
  // data: and blob: URLs are made on the device and never leave it.
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  return new URL(url).origin === origin;
}

/** Below about 1100px wide the five nav links live inside the phone menu sheet; open it first when it's there. */
async function openMobileNavIfPresent(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

test('every request stays on the site itself', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  const urls = recordRequests(page);

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
  }
  // Follow a link too, so client-side navigation is covered.
  await openMobileNavIfPresent(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
  await expect(page.locator('h1')).toHaveText('Exploring Our World');
  await page.waitForLoadState('networkidle');

  expect(urls.length).toBeGreaterThan(0);
  const thirdParty = urls.filter((url) => !isOwnOrigin(url, origin));
  expect(thirdParty, `Third-party requests:\n${thirdParty.join('\n')}`).toEqual([]);

  for (const blocked of [/fonts\.(googleapis|gstatic)\.com/, /google-analytics|googletagmanager|doubleclick/, /youtube/]) {
    expect(urls.filter((url) => blocked.test(url))).toEqual([]);
  }
});

test('the page sets no cookies', async ({ page, context }) => {
  for (const route of routes.slice(0, 5)) await page.goto(route);
  expect(await context.cookies()).toEqual([]);
});

test('the self-hosted fonts load from the site', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });

  await page.goto('/lesson/towns-near-rivers/read');
  await expect(page.locator('h1')).toHaveCount(1);

  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === 'loaded')
      .map((face) => face.family.replace(/^["']|["']$/g, ''));
  });
  expect(loaded).toContain('Funnel Display');
  expect(loaded).toContain('Atkinson Hyperlegible Next');

  // The heading and body text actually use them.
  const families = await page.evaluate(() => ({
    h1: getComputedStyle(document.querySelector('h1')!).fontFamily,
    body: getComputedStyle(document.body).fontFamily,
  }));
  expect(families.h1).toContain('Funnel Display');
  expect(families.body).toContain('Atkinson Hyperlegible Next');

  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) {
    expect(new URL(url).origin).toBe(origin);
    expect(url).toMatch(/\.woff2(\?|$)/);
  }
});

test.describe('Watch: nothing from YouTube or Google until the learner taps play', () => {
  const VIDEO_HOSTS = /youtube|ytimg|googlevideo|google\.|gstatic|doubleclick|ggpht/;

  test('no request before the tap; after it, one nocookie frame with its own referrer policy and no autoplay', async ({
    page,
  }) => {
    const urls = recordRequests(page);
    // Stand in for YouTube, so the test never depends on (or contacts) it.
    await page.route(/youtube-nocookie\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
    );

    await page.goto('/lesson/towns-near-rivers/watch');
    await expect(page.getByRole('button', { name: 'Watch the video' })).toBeVisible();
    // The local poster shows the title, channel and duration from the content.
    await expect(page.getByText('Ancient Mesopotamia 101').first()).toBeVisible();
    await expect(page.getByText('National Geographic').first()).toBeVisible();
    await expect(page.getByText('4:10').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(urls.filter((url) => VIDEO_HOSTS.test(new URL(url).hostname))).toEqual([]);
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(await page.locator('link[rel="preconnect"], link[rel="dns-prefetch"]').count()).toBe(0);

    await page.getByRole('button', { name: 'Watch the video' }).click();
    const frame = page.locator('iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    const src = (await frame.getAttribute('src')) ?? '';
    expect(src.startsWith('https://www.youtube-nocookie.com/embed/xVf5kZA0HtQ?')).toBe(true);
    expect(src).not.toMatch(/autoplay/);
    expect((await frame.getAttribute('allow')) ?? '').not.toMatch(/autoplay/);
    // The page itself still sends no referrer anywhere else.
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  });
});
