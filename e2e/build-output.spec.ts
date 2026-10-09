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
 * The course model and Digital World's hidden preview took 1.4 kB more
 * (643.8 kB, within the budget): the shared lesson pages' course plumbing,
 * the routes and the small list of courses. Digital World itself (its lessons, activities,
 * words and styles, 56.5 kB) is in assets/preview/, never precached
 * (the test below; docs/notes/digital-world-preview.md).
 * Raised to 655 kB with Thinkerwell's own videos on About, For educators,
 * For organisations and the setup checklist: 649.4 kB with them (643.8 kB
 * before), all of it the player and the three videos' words in both
 * languages, in the chunk those pages share, so "Read instead" works
 * offline. The video files themselves (17 MB) are never precached and
 * download only on a tap (docs/notes/site-videos.md). It leaves room for
 * one more small feature.
 */
const PRECACHE_BUDGET = 655_000;
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
 * 221.6 kB with the course model and Digital World's hidden preview (221.0 kB before): the device setting that turns a
 * preview on and the few lines that look for it. No Digital World words or code reach a first visit (the test below;
 * docs/notes/slow-internet.md "Later budget changes").
 * Raised to 224.5 kB with the square favicon: 224.0 kB with it (221.6 kB before). Google Search shows only square
 * favicons, and the mascot picture the tab used is 422 x 423, so the tab icon is now a file of its own,
 * icons/favicon-96.png (2.3 kB, a 256-colour PNG, which can't be compressed further). Before, the browser reused the
 * mascot picture the first screen loads anyway (docs/notes/seo.md "The favicon").
 * 224.3 kB with Thinkerwell's own videos (224.0 kB before): their words are the first message group to load with
 * the pages that show them instead of with en.json (src/i18n/lazyGroups.ts), so the transcripts never reach a first
 * visit; what did is the poster's styles and a few bytes of the shared VideoCard (docs/notes/site-videos.md).
 */
const FIRST_VISIT_HOME_BUDGET = 224_500;

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

// Digital World is a preview course (docs/notes/digital-world-preview.md):
// its lessons, activities, words and styles are built into assets/preview/,
// which the service worker never precaches, and load only on a device that
// turned the preview on. These words and names appear nowhere else.
const DIGITAL_WORLD = [
  'Draft course: not yet reviewed',
  'Kursus draf',
  "What AI is, and what it isn't",
  'Train the leaf model',
  'Plan your AI helper',
  'dw-what-ai-is',
  'tw-dw-',
];

test('no Digital World content or code is precached or reaches a first visit', { tag: '@own-size' }, async ({ page, request, baseURL }) => {
  const urls = await precacheList(request);
  expect(urls.filter((url) => url.includes('/preview/'))).toEqual([]);
  for (const url of urls.filter((u) => TEXT.test(u))) {
    const text = (await sentSize(request, url)).body.toString('utf8');
    for (const marker of DIGITAL_WORLD) expect(text.includes(marker), `${url} has "${marker}"`).toBe(false);
  }

  const origin = new URL(baseURL ?? 'http://localhost').origin;
  const firstVisit = new Set<string>();
  page.on('request', (r) => {
    if (new URL(r.url()).origin === origin) firstVisit.add(new URL(r.url()).pathname);
  });
  for (const path of ['/', '/course']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  expect([...firstVisit].filter((url) => url.includes('/preview/'))).toEqual([]);
  for (const url of [...firstVisit].filter((u) => TEXT.test(u) || u === '/')) {
    const text = (await sentSize(request, url)).body.toString('utf8');
    for (const marker of DIGITAL_WORLD) expect(text.includes(marker), `${url} has "${marker}"`).toBe(false);
  }

  // The words are real: with the preview on, they arrive from assets/preview/.
  const previewFiles: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/assets/preview/')) previewFiles.push(r.url());
  });
  await page.goto('/preview/digital-world');
  await expect(page.locator('h1')).toHaveText('Digital World preview is on');
  await page.waitForLoadState('networkidle');
  let previewText = '';
  for (const url of previewFiles) previewText += (await sentSize(request, url)).body.toString('utf8');
  for (const marker of DIGITAL_WORLD) expect(previewText, marker).toContain(marker);
});
