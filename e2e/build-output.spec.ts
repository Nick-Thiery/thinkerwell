import { brotliCompressSync, constants } from 'node:zlib';
import { expect, test, type APIRequestContext } from '@playwright/test';

// Tagged @own-size: sizes don't depend on the window, so these run once, in
// the laptop project.
//
// What the production build makes every device download
// (docs/notes/slow-internet.md). The budgets sit a little above the sizes
// measured when they were set, so a change that adds a lot fails here and
// has to say why (and raise the budget) rather than slip in. Sizes are
// Brotli, as Vercel sends text files; fonts and images count as they are.

/**
 * The whole course, downloaded once by the service worker: 469.1 kB when set
 * at 480 kB (514.0 kB before). Raised to 490 kB when the language groundwork
 * and the pilot-day tools were merged in: 480.5 kB with them, 11.4 kB more
 * for the language code, three new Educators pages and their words, and the
 * "hasn't downloaded yet" page (docs/notes/slow-internet.md, "Merged").
 * Raised to 620 kB when Bahasa Indonesia became ready: 609.2 kB with it. A
 * ready language is in every device's offline copy, and Indonesian brings
 * its lessons, section checks and pictures as well as its messages (about
 * 124 kB), so the Jakarta pilot's learners have the whole course in
 * Indonesian offline. English first visits don't change
 * (docs/notes/languages.md, "Bahasa Indonesia").
 */
const PRECACHE_BUDGET = 620_000;
/** Every file a first visit to the home page fetches, before and after the first screen: 204.5 kB when set (315.0 kB before), 210.5 kB after the language and pilot-day merges. */
const FIRST_VISIT_HOME_BUDGET = 212_000;

const TEXT = /\.(html|js|css|svg|json|webmanifest)$/;

/** A file's size as a browser downloads it from Vercel. */
async function sentSize(request: APIRequestContext, url: string): Promise<{ size: number; body: Buffer }> {
  const response = await request.get(url);
  expect(response.status(), url).toBe(200);
  const body = await response.body();
  const pathname = new URL(url, 'http://x').pathname;
  const size = TEXT.test(pathname) || pathname === '/'
    ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
    : body.length;
  return { size, body };
}

/** Every URL in the service worker's precache list. */
async function precacheList(request: APIRequestContext): Promise<string[]> {
  const sw = await (await request.get('/sw.js')).text();
  const urls = [...sw.matchAll(/"?url"?:"([^"]+)"/g)].map((match) => `/${match[1]!}`);
  expect(urls.length).toBeGreaterThan(20);
  return urls;
}

test('the whole course the service worker downloads stays within its budget', { tag: '@own-size' }, async ({ request }) => {
  let total = 0;
  for (const url of await precacheList(request)) total += (await sentSize(request, url)).size;
  expect(total, `precache is ${(total / 1000).toFixed(1)} kB`).toBeLessThanOrEqual(PRECACHE_BUDGET);
});

test('a first visit to the home page stays within its budget, and loads no lesson', { tag: '@own-size' }, async ({ page, request, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  const urls = new Set<string>();
  page.on('request', (r) => {
    if (new URL(r.url()).origin === origin) urls.add(new URL(r.url()).pathname);
  });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText("Who's learning today?");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');

  let total = 0;
  for (const url of urls) total += (await sentSize(request, url)).size;
  expect(total, `first visit is ${(total / 1000).toFixed(1)} kB`).toBeLessThanOrEqual(FIRST_VISIT_HOME_BUDGET);
  // The lessons (the content chunk) and the lazily loaded pages load with the pages that show them.
  expect([...urls].filter((url) => /\/(content|lessonPages|teacherPages|morePages)-[\w-]+\.js$/.test(url))).toEqual([]);
});

test('the production build has no source maps and no dev-only pages', { tag: '@own-size' }, async ({ page, request }) => {
  const urls = await precacheList(request);
  expect(urls.filter((url) => url.endsWith('.map'))).toEqual([]);
  for (const url of urls.filter((u) => u.endsWith('.js') || u.endsWith('.css'))) {
    const text = (await sentSize(request, url)).body.toString('utf8');
    expect(text, url).not.toMatch(/sourceMappingURL/);
    // src/dev (the component gallery and the docs/screens viewer) exists only in `npm run dev`.
    expect(text, url).not.toMatch(/docs\/screens|\.dc\.html/);
    // Vercel answers a missing file with a 404, `vite preview` with the page: either way, not a map.
    expect(await (await request.get(`${url}.map`)).text(), `${url}.map`).not.toMatch(/"mappings"/);
  }
  await page.goto('/dev/components');
  await expect(page.locator('h1')).toHaveText("This page isn't here");
});
