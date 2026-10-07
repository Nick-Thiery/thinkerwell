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
 * - Listen's recordings (/audio/, docs/notes/recorded-audio.md) are not in
 *   the precache (they are tens of megabytes): each is kept in a cache of
 *   its own (AUDIO_CACHE) the first time the page fetches it, when Listen
 *   plays it or a teacher downloads them all in Settings, and answered from
 *   there after that, so they work offline. Their names carry a hash of
 *   their content, so a kept file never goes stale; files no section uses
 *   any more are deleted when a new version starts and whenever a
 *   language's new timings file arrives (pruneAudio). A new version never
 *   empties this cache: recordings that didn't change stay.
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
import { AUDIO_CACHE, AUDIO_PREFIX } from '../audio/cache';
import recordings from '../audio/recordings.json';

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

/** Each recorded language's current timings file (src/audio/recordings.json): it lists the recordings in use. */
const recorded: Readonly<Record<string, { timings: string }>> = recordings;
const currentTimings = new Map(Object.entries(recorded).map(([lang, entry]) => [lang, entry.timings]));

/** The language of a path under /audio/ ("/audio/id/x.mp3" → "id"). */
function audioLang(path: string): string {
  return path.slice(AUDIO_PREFIX.length).split('/')[0] ?? '';
}

/**
 * Deletes kept recordings that no section uses any more: for each language,
 * everything its current timings file doesn't list (old timings files too),
 * and everything of a language that has no recordings now. A language whose
 * current timings file isn't kept yet is fetched first if `fetchMissing`;
 * if that fails (offline), its files stay until it arrives.
 */
async function pruneAudio(fetchMissing: boolean): Promise<void> {
  const cache = await caches.open(AUDIO_CACHE);
  const byLang = new Map<string, string[]>();
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    const lang = audioLang(path);
    byLang.set(lang, [...(byLang.get(lang) ?? []), path]);
  }
  for (const [lang, paths] of byLang) {
    const current = currentTimings.get(lang);
    let timings = current ? await cache.match(current) : undefined;
    if (current && !timings && fetchMissing) {
      try {
        const response = await fetch(current);
        if (response.ok) {
          await cache.put(current, response.clone());
          timings = response;
        }
      } catch {
        // Offline: decide another time.
      }
    }
    if (current && !timings) continue;
    const sections = timings ? ((await timings.json()) as { sections: Record<string, { f: string }> }).sections : {};
    const keep = new Set([current, ...Object.values(sections).map((section) => `${AUDIO_PREFIX}${lang}/${section.f}`)]);
    await Promise.all(paths.filter((path) => !keep.has(path)).map((path) => cache.delete(path)));
  }
}

/** A recording or timings file: from the cache, else from the site, kept for next time. */
async function audioFromCache(request: Request, event: ExtendableEvent): Promise<Response> {
  const cache = await caches.open(AUDIO_CACHE);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.status === 200 && response.type === 'basic') {
    const path = new URL(request.url).pathname;
    const stored = cache.put(request, response.clone());
    // A language's new timings file: the recordings it doesn't list can go.
    const isTimings = currentTimings.get(audioLang(path)) === path;
    event.waitUntil(isTimings ? stored.then(() => pruneAudio(false)) : stored);
  }
  return response;
}

self.addEventListener('install', (event) => event.waitUntil(installPrecache(event)));
self.addEventListener('activate', (event) => {
  event.waitUntil(precache.activate(event));
  event.waitUntil(pruneAudio(true).catch(() => undefined));
});

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
clientsClaim();

registerRoute(new PrecacheRoute(precache));
cleanupOutdatedCaches();
// Listen's recordings: whole files only (a byte-range request, which this site never makes, goes to the network).
registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith(AUDIO_PREFIX) && request.method === 'GET' && !request.headers.has('range'),
  ({ request, event }) => audioFromCache(request, event),
);
registerRoute(
  new NavigationRoute(precache.createHandlerBoundToURL('/index.html'), {
    // /api/ (measurement, later) and addresses of files (such as
    // /icons/icon-512.png) go to the network.
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  }),
);
