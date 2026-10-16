import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// "Update now" (src/offline/serviceWorker.ts, docs/notes/phase-6.md): one
// tap or click on the button, anywhere on it, starts the new version, and
// the page never reloads by itself.
//
// A new version needs a server whose sw.js changes while the page is open.
// Playwright's routes don't see the browser's own update check for sw.js,
// so each test serves the production build (dist/, which the webServer in
// playwright.config.ts builds) from a small server of its own, with a
// version number added to sw.js. The workers answer TW_VERSION with it, so
// a test can ask which version controls the page.
test.use({ serviceWorkers: 'allow' });

const DIST = join(process.cwd(), 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

interface Site {
  origin: string;
  /** The version the next sw.js download gets. */
  version: number;
  /** How long a recording under /audio/slow takes to finish downloading. */
  slowAudioMs: number;
  close(): Promise<void>;
}

async function startSite(): Promise<Site> {
  const server = createServer((request, response) => {
    void (async () => {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://site').pathname);
      if (path.startsWith('/audio/slow')) {
        // A recording on a slow connection: the old worker keeps it in its
        // cache (sw.ts), so it has work in hand until the last byte.
        response.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        response.write(Buffer.alloc(1024));
        setTimeout(() => response.end(Buffer.alloc(1024)), site.slowAudioMs);
        return;
      }
      // Every page address gets the app (the home page's file is enough here).
      const file = extname(path) ? normalize(path).replace(/^(\.\.[/\\])+/, '') : '/index.html';
      try {
        let body: Buffer | string = await readFile(join(DIST, file));
        if (file === '/sw.js') {
          body = `${body.toString()}
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TW_VERSION') event.ports[0].postMessage(${site.version});
});`;
        }
        response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
        response.end(body);
      } catch {
        response.writeHead(404);
        response.end();
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const site: Site = {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    version: 1,
    slowAudioMs: 0,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
  return site;
}

/** The version of the worker that controls the page, or of the one waiting. */
function versionOf(page: Page, which: 'controller' | 'waiting'): Promise<number | null> {
  return page.evaluate(async (which) => {
    const registration = await navigator.serviceWorker.getRegistration();
    const sw = which === 'controller' ? navigator.serviceWorker.controller : (registration?.waiting ?? null);
    if (!sw) return null;
    return new Promise<number>((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data as number);
      sw.postMessage({ type: 'TW_VERSION' }, [channel.port2]);
      setTimeout(() => reject(new Error(`The ${which} worker didn't answer`)), 5000);
    });
  }, which);
}

/** The first visit: the whole course stored and version 1 in charge. */
async function firstVisit(page: Page, site: Site): Promise<void> {
  await page.goto(`${site.origin}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  expect(await versionOf(page, 'controller')).toBe(1);
}

/** Puts a new version on the site and lets the open page find it (as its hourly check does). */
async function deploy(page: Page, site: Site, version: number): Promise<void> {
  site.version = version;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await expect.poll(() => versionOf(page, 'waiting'), { timeout: 30_000 }).toBe(version);
}

/** Marks this copy of the page, so a test can tell when it has been loaded again. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { twBeforeUpdate?: boolean }).twBeforeUpdate = true;
  });
}

async function reloaded(page: Page, timeout: number): Promise<void> {
  await page.waitForFunction(() => !(window as unknown as { twBeforeUpdate?: boolean }).twBeforeUpdate, undefined, { timeout });
  await page.waitForLoadState();
}

/** One tap on a touch screen, one click with a mouse, on the words inside the button. */
async function pressUpdateNow(page: Page, hasTouch: boolean): Promise<void> {
  const words = updateBanner(page).getByRole('button').getByText('Update now');
  if (hasTouch) await words.tap();
  else await words.click();
}

const updateBanner = (page: Page) => page.getByRole('status').filter({ hasText: 'A new version is ready.' });

let site: Site;
test.beforeEach(async () => {
  site = await startSite();
});
test.afterEach(async () => {
  await site.close();
});

test('one tap or click on "Update now" starts the new version', { tag: '@chromium-only' }, async ({ page, hasTouch }) => {
  await firstVisit(page, site);
  await deploy(page, site, 2);
  await expect(updateBanner(page)).toBeVisible();
  // Waiting is all it does until someone asks.
  await page.waitForTimeout(1000);
  expect(await versionOf(page, 'controller')).toBe(1);

  await markPage(page);
  await pressUpdateNow(page, hasTouch);
  await reloaded(page, 5000);
  expect(await versionOf(page, 'controller')).toBe(2);
  await expect(page.locator('h1')).toBeVisible();
  await expect(updateBanner(page)).toHaveCount(0);
});

test('a third version that arrives while the banner shows is the one that starts', { tag: '@chromium-only' }, async ({
  page,
  hasTouch,
}) => {
  await firstVisit(page, site);
  await deploy(page, site, 2);
  await expect(updateBanner(page)).toBeVisible();
  await deploy(page, site, 3);
  await expect(updateBanner(page)).toBeVisible();

  await markPage(page);
  await pressUpdateNow(page, hasTouch);
  await reloaded(page, 5000);
  expect(await versionOf(page, 'controller')).toBe(3);
  await expect(updateBanner(page)).toHaveCount(0);
});

test('while the old version is still busy, the tap waits for the new one instead of reloading onto the old one', { tag: '@chromium-only' }, async ({
  page,
  hasTouch,
}) => {
  await firstVisit(page, site);
  await deploy(page, site, 2);
  await expect(updateBanner(page)).toBeVisible();

  // A recording still downloading through the old worker: the browser
  // starts the new version only once it has finished (here after 6 s).
  site.slowAudioMs = 6000;
  await page.evaluate(() => {
    void fetch('/audio/slow-recording.mp3').then((response) => response.arrayBuffer());
  });
  await page.waitForTimeout(300);

  await markPage(page);
  await pressUpdateNow(page, hasTouch);
  await expect(updateBanner(page).getByRole('button', { name: 'Updating…' })).toBeVisible();
  // Before, the page reloaded after 4 s onto the old version, and the banner came back.
  await page.waitForTimeout(4500);
  expect(await page.evaluate(() => (window as unknown as { twBeforeUpdate?: boolean }).twBeforeUpdate)).toBe(true);

  await reloaded(page, 10_000);
  expect(await versionOf(page, 'controller')).toBe(2);
  await expect(updateBanner(page)).toHaveCount(0);
});
