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
 * Raised to 630 kB with the sources check and the partner kit: 624.8 kB with
 * them, for each lesson's Sources, the About credits, three new pages (For
 * organisations, the consent form, code cards) and their words in both
 * languages (docs/notes/partner-kit.md).
 * Raised to 635 kB with the consent form's study parts and the information
 * sheet: 630.4 kB with them (626.2 kB before), all of it their words and
 * code: the English messages 1.3 kB, the Indonesian 1.2 kB, the pages' code
 * 1.1 kB and their styles 0.5 kB (docs/notes/slow-internet.md, "Later budget changes").
 * Raised to 645 kB with the Listen voice choice and the About page's mission
 * card: 635.4 kB with both (630.4 kB before), for the voice ranking, the
 * "Listen voice" part of Settings, the setup checklist's voice step and their
 * words in both languages (docs/notes/listen-voices.md), and the About
 * changes merged alongside. It leaves room for one more small feature.
 * It was 636.1 kB with search engines and LinkedIn. Listen's recordings
 * took 6.4 kB more (642.5 kB): the player and
 * the download manager (a chunk of their own, 2.8 kB, and Settings' and the
 * Read stage's parts) and their words in both languages. The recordings
 * themselves (about 45 MB) are never precached: each is kept once it has
 * played, or when a teacher downloads them (docs/notes/recorded-audio.md).
 */
const PRECACHE_BUDGET = 645_000;
/**
 * Every file a first visit to the home page fetches, before and after the first screen: 204.5 kB when set (315.0 kB before),
 * 210.5 kB after the language and pilot-day merges, 212.7 kB with the header's language switch and the one language
 * setting (every page, from the first, can change the language; about 2 kB), 216.3 kB with the sources check and
 * the partner kit (their English messages load with the rest of en.json, and the footer is on every page),
 * 218.8 kB with the consent form's study parts and the information sheet (216.9 kB before): their English words,
 * 1.3 kB, are in en.json, which is in the app's first chunk with every interface word, and their styles, 0.5 kB,
 * are in the one stylesheet every page shares. No page code reaches the first visit. 220.0 kB after the Listen voice
 * choice, and 220.5 kB with search engines and LinkedIn (docs/notes/seo.md): the home page's own title, canonical
 * link and structured data in index.html, the pages' search titles in en.json (their descriptions are left out of
 * the browser's copy, stripBuildOnlyMessages) and the footer's LinkedIn link; raised to 221 kB.
 * Raised to 222 kB with Listen's recordings: 221.2 kB with them (220.5 kB before, measured on the same machine),
 * all of it their words (35 messages: Settings' "Lesson audio", the recorded sample, the Read step's notes, the setup
 * checklist's pointer and the Credits page's voices) in en.json, and a few bytes of styles. The player, the download
 * manager and the recordings themselves load with the lesson and Settings pages, or on a tap, never on a first visit
 * (docs/notes/recorded-audio.md, docs/notes/slow-internet.md "Later budget changes").
 */
const FIRST_VISIT_HOME_BUDGET = 222_000;

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
