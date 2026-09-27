import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { L10 } from './lessonHelpers';
import { walkTour } from './pageTour';

// Phase 8: the security headers in vercel.json, which `vite preview` also
// sends (vite.config.ts), so every end-to-end test runs under the real
// Content-Security-Policy. This spec checks the headers arrive, and that no
// page type, and no tap on "Watch the video", breaks the policy.

interface VercelConfig {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}
const vercel = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'vercel.json'), 'utf8')) as VercelConfig;
const siteHeaders = vercel.headers.find((rule) => rule.source === '/(.*)')!.headers;

/** Collects every Content-Security-Policy violation the page reports, from the first script on. */
async function recordViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective} blocked ${event.blockedURI || '(inline)'} at ${event.sourceFile}:${event.lineNumber}`);
    });
  });
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy|Content-Security-Policy|Permissions-Policy/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  return async () => [...(await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations)), ...consoleErrors];
}

test('every page and file is sent with the security headers from vercel.json', async ({ request }) => {
  for (const url of ['/', L10.path('read'), '/manifest.webmanifest', '/sw.js']) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    for (const { key, value } of siteHeaders) expect(response.headers()[key.toLowerCase()], `${url}: ${key}`).toBe(value);
  }
  const csp = siteHeaders.find((h) => h.key === 'Content-Security-Policy')!.value;
  // Only this site, plus the youtube-nocookie player in a frame.
  expect(csp.match(/https?:\/\/[^\s;]+/g)).toEqual(['https://www.youtube-nocookie.com']);
  expect(csp).toMatch(/frame-src https:\/\/www\.youtube-nocookie\.com;/);
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
});

test.describe('the Content-Security-Policy', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('no page type breaks it', { tag: '@own-size' }, async ({ page }) => {
    test.setTimeout(120_000);
    const violations = await recordViolations(page);
    await walkTour(page, async (stop) => {
      expect.soft(await violations(), stop.name).toEqual([]);
    });
  });

  test('the video player is allowed in its frame after the tap', { tag: '@own-size' }, async ({ page }) => {
    const violations = await recordViolations(page);
    // Stand in for YouTube, so the test never contacts it.
    await page.route(/youtube-nocookie\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title><p>Player</p>' }),
    );
    await page.goto(L10.path('watch'));
    await page.getByRole('button', { name: 'Watch the video' }).click();
    await expect(page.frameLocator('iframe').getByText('Player')).toBeVisible();
    expect(await violations()).toEqual([]);
  });
});
