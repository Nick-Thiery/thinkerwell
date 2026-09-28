/// <reference lib="webworker" />
/**
 * The service worker (built by vite-plugin-pwa's injectManifest, vite.config.ts,
 * into dist/sw.js). It does what the generated Workbox worker did before
 * (docs/notes/phase-6.md), with one difference: at install it downloads the
 * precache several files at a time instead of one after another
 * (docs/notes/slow-internet.md).
 *
 * - Precaches the whole site (self.__WB_MANIFEST, filled in at build time),
 *   so every lesson works offline after the first visit.
 * - Page loads (navigations) get the precached index.html, except /api/ and
 *   addresses of files (anything with an extension).
 * - Nothing else is cached, and nothing is fetched from other servers.
 * - A new version waits until the page sends SKIP_WAITING ("Update now");
 *   the first install takes charge of the open page (clientsClaim).
 * - Old versions' leftovers are deleted when a new version activates.
 *
 * Why in parallel: Workbox's own install fetches one file at a time, so each
 * file costs a full round trip before the next starts. On a connection with
 * 400 to 600 ms round trips, 40 files spent 16 to 23 s just waiting. Each
 * file is still fetched and stored by Workbox's own precache strategy, with
 * the same checks and cache keys; only the order changes, CONCURRENCY at a
 * time. As before, a file already stored under the same key (from an earlier
 * version, or an install the connection broke off) isn't downloaded again,
 * and the install fails, and is tried again later, if any file can't be stored.
 */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, PrecacheController, PrecacheRoute, type PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> };

/** How many precache files download at once. Browsers open about six connections to a site. */
const CONCURRENCY = 6;

const manifest = self.__WB_MANIFEST;
const precache = new PrecacheController();
precache.addToCacheList(manifest);

/** As Workbox does: a file whose name has no hash (it has a revision) skips the HTTP cache. */
const cacheModes = new Map(
  manifest.map((entry): [string, RequestCache] => {
    const url = typeof entry === 'string' ? entry : entry.url;
    const revised = typeof entry !== 'string' && Boolean(entry.revision);
    return [new URL(url, self.location.href).href, revised ? 'reload' : 'default'];
  }),
);

async function installPrecache(event: ExtendableEvent): Promise<void> {
  const queue = [...precache.getURLsToCacheKeys()];
  const next = async (): Promise<void> => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [url, cacheKey] = item;
      const request = new Request(url, {
        integrity: precache.getIntegrityForCacheKey(cacheKey),
        cache: cacheModes.get(url) ?? 'default',
        credentials: 'same-origin',
      });
      // Stores the file under its cache key, or throws if it can't be stored.
      await Promise.all(precache.strategy.handleAll({ params: { cacheKey }, request, event }));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, next));
}

self.addEventListener('install', (event) => event.waitUntil(installPrecache(event)));
self.addEventListener('activate', (event) => event.waitUntil(precache.activate(event)));

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
clientsClaim();

registerRoute(new PrecacheRoute(precache));
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(precache.createHandlerBoundToURL('/index.html'), {
    // /api/ (measurement, later) and addresses of files (such as
    // /icons/icon-512.png) go to the network.
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  }),
);
