import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { seoPages, type SeoLesson } from '../src/seo/build.ts';
import { SITE_ORIGIN, THINKERWELL_LINKEDIN } from '../src/seo/site.ts';

// Search engines and link previews (docs/notes/seo.md), against the
// production build served the way vercel.json serves it (vite.config.ts,
// seoFiles): what a crawler reads in each address's raw HTML, before any
// script runs, and what the page says once the app has drawn it.

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;
const lessons = readdirSync(path.join(root, 'content', 'lessons'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => readJson<SeoLesson>('content', 'lessons', name));
const pages = seoPages({
  messages: readJson<unknown>('src', 'i18n', 'messages', 'en.json'),
  courseTitle: readJson<{ course: { title: string } }>('content', 'course.json').course.title,
  lessons,
});

const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];
const titleOf = (html: string) => attr(html, /<title>([^<]*)<\/title>/);
const canonicalOf = (html: string) => attr(html, /<link rel="canonical" href="([^"]+)"/);
const decode = (text: string) => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Raw HTML is the same at every width: check it once, in the laptop project.
test.describe('raw HTML @own-size', () => {
  test('each public page has its own title, description and canonical link, and no noindex', async ({ request }) => {
    for (const page of pages) {
      const response = await request.get(page.path);
      expect(response.status(), page.path).toBe(200);
      const html = await response.text();
      expect(decode(titleOf(html) ?? ''), page.path).toBe(page.title);
      expect(decode(attr(html, /<meta name="description" content="([^"]*)"/) ?? ''), page.path).toBe(page.description);
      expect(canonicalOf(html), page.path).toBe(page.canonical);
      expect(attr(html, /<meta property="og:url" content="([^"]+)"/), page.path).toBe(page.canonical);
      expect(html.match(/rel="canonical"/g), page.path).toHaveLength(1);
      expect(html, page.path).not.toContain('name="robots"');
      // The same app as every other page.
      expect(html, page.path).toMatch(/<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/);
    }
  });

  test('the home page carries WebSite and Organization structured data, with the LinkedIn Page', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const json = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const data = JSON.parse(json!) as { '@graph': Array<{ '@type': string; sameAs?: string[] }> };
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['WebSite', 'Organization']);
    expect(data['@graph'][1]!.sameAs).toEqual([THINKERWELL_LINKEDIN]);
  });

  test('every other address gets the noindex shell, with no canonical link', async ({ request }) => {
    for (const address of [
      '/journal',
      '/journal/print',
      '/settings',
      '/educators/setup',
      '/educators/class',
      '/educators/lesson/towns-near-rivers',
      '/educators/section/history/answers',
      '/educators/consent-form',
      '/educators/code-cards',
      '/certificate/course',
      '/section/history/check',
      '/lesson/towns-near-rivers',
      '/lesson/towns-near-rivers/write',
      '/lesson/towns-near-rivers/watch',
      '/lesson/towns-near-rivers/print',
      '/lesson/l6',
      '/lesson/nope/read',
      '/whatever',
    ]) {
      const response = await request.get(address);
      expect(response.status(), address).toBe(200);
      const html = await response.text();
      expect(html, address).toContain('<meta name="robots" content="noindex" />');
      expect(canonicalOf(html), address).toBeUndefined();
    }
  });

  test('an address ending in a slash is redirected without it', async ({ request }) => {
    const response = await request.get('/about/', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()['location']).toBe('/about');
  });

  test('sitemap.xml lists exactly the public pages, and each one is served with that canonical link', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
    expect(locs).toEqual(pages.map((page) => page.canonical));
    for (const loc of locs) {
      const html = await (await request.get(loc.slice(SITE_ORIGIN.length) || '/')).text();
      expect(canonicalOf(html), loc).toBe(loc);
    }
  });

  test('every public page links the square favicon, and the site serves it and /favicon.ico', async ({ request }) => {
    for (const page of pages) {
      const html = await (await request.get(page.path)).text();
      expect(attr(html, /<link rel="icon"[^>]*href="([^"]+)"/), page.path).toBe('/icons/favicon-96.png');
    }
    const icon = await request.get('/icons/favicon-96.png');
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toBe('image/png');
    const bytes = await icon.body();
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([96, 96]);
    const ico = await request.get('/favicon.ico');
    expect(ico.status()).toBe(200);
    expect((await ico.body()).readUInt16LE(2)).toBe(1);
  });

  test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('User-agent: *');
    expect(text).not.toMatch(/^Disallow:/m);
    expect(text).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

test.describe('once the app has drawn the page', () => {
  test('a public page keeps the title, description and canonical link its HTML gave crawlers', async ({ page, request }) => {
    for (const expected of pages.filter((p) => ['/', '/about', '/course', '/educators', '/organisations', '/credits', '/lesson/finding-out-about-the-past/read'].includes(p.path))) {
      const raw = await (await request.get(expected.path)).text();
      await page.goto(expected.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page, expected.path).toHaveTitle(decode(titleOf(raw)!));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expected.canonical);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', expected.description);
    }
  });

  test('the course page links every lesson’s public address with an ordinary link, even in a closed section', async ({ page }) => {
    await page.goto('/course');
    await expect(page.locator('h1')).toHaveText('Exploring Our World');
    const hrefs = await page.locator('a[href^="/lesson/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    for (const lesson of lessons) expect(hrefs, lesson.id).toContain(`/lesson/${lesson.id}/read`);
  });

  test('the footer links Thinkerwell’s LinkedIn Page in a new tab', async ({ page }) => {
    await page.goto('/about');
    const link = page.locator('footer').getByRole('link', { name: /Thinkerwell on LinkedIn/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', THINKERWELL_LINKEDIN);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
