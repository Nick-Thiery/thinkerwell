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
 * - The other courses' files (COURSE_PREFIX, /assets/preview/: their code,
 *   lessons, words, styles and pictures, about 10 MB, built apart so a first
 *   visit stays light) are kept the same way, in COURSE_CACHE, the first time
 *   the page fetches them (a learner opens the course) or all at once when a
 *   teacher saves a course in Settings (src/offline/courseFiles.ts). Their
 *   names carry a hash too. The list of the current files is
 *   /course-files.json, built with the site; when a new version starts, kept
 *   files it doesn't list are deleted (pruneCourses), and the list itself
 *   is answered from the network, else from the copy kept last time.
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
import courseRecordings from '../audio/courseRecordings.json';
import { COURSE_CACHE, COURSE_MANIFEST_URL, isCourseFile, type CourseFilesManifest } from './courseCache';
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

/**
 * Each set of recordings' current timings file: Our World's by language
 * (src/audio/recordings.json), and each preview course's by "<lang>/<course>"
 * (src/audio/courseRecordings.json). Each lists the recordings in use.
 */
const recorded: Readonly<Record<string, { timings: string }>> = recordings;
const recordedCourses: Readonly<Record<string, Readonly<Record<string, { timings: string }>>>> = courseRecordings;
const currentTimings = new Map([
  ...Object.entries(recorded).map(([lang, entry]): [string, string] => [lang, entry.timings]),
  ...Object.entries(recordedCourses).flatMap(([course, langs]) => Object.entries(langs).map(([lang, entry]): [string, string] => [`${lang}/${course}`, entry.timings])),
]);

/** The set of recordings a path under /audio/ belongs to: "/audio/id/x.mp3" → "id", "/audio/id/digital-world/x.mp3" → "id/digital-world". */
function audioLang(path: string): string {
  const parts = path.slice(AUDIO_PREFIX.length).split('/');
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : (parts[0] ?? '');
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
    // `lang` is a set of recordings: "id", or "id/digital-world" for a course's (its own folder).
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

/**
 * A course file: from the cache, else from the site, kept for next time.
 * Files are named by hash, so a kept one is never stale. `ignoreVary`: a
 * server that answers "Vary: Origin" (vite preview does) would otherwise not
 * match a script the page asks for (which sends an Origin header) with the
 * copy Settings fetched (which doesn't); the file is the same.
 */
async function courseFileFromCache(request: Request, event: ExtendableEvent): Promise<Response> {
  const cache = await caches.open(COURSE_CACHE);
  const kept = await cache.match(request, { ignoreVary: true });
  if (kept) return kept;
  const response = await fetch(request);
  if (response.status === 200 && response.type === 'basic') event.waitUntil(cache.put(request, response.clone()));
  return response;
}

/**
 * The list of the current course files: from the network (and kept), else the
 * copy kept the last time, else the network's own failure. Never from the
 * browser's HTTP cache, so a new version's list is seen at once.
 */
async function courseManifest(request: Request, event: ExtendableEvent): Promise<Response> {
  const cache = await caches.open(COURSE_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.status === 200 && response.type === 'basic') event.waitUntil(cache.put(COURSE_MANIFEST_URL, response.clone()));
    return response;
  } catch (error) {
    const kept = await cache.match(COURSE_MANIFEST_URL);
    if (kept) return kept;
    throw error;
  }
}

/**
 * Deletes kept course files the current version doesn't list (a changed file
 * has a new name), and everything but the list itself if the version lists no
 * courses. Offline, nothing is decided: the files stay until the list arrives.
 */
async function pruneCourses(): Promise<void> {
  let listed: CourseFilesManifest;
  try {
    const response = await fetch(COURSE_MANIFEST_URL, { cache: 'no-cache' });
    if (!response.ok) return;
    const cache = await caches.open(COURSE_CACHE);
    await cache.put(COURSE_MANIFEST_URL, response.clone());
    listed = (await response.json()) as CourseFilesManifest;
  } catch {
    return;
  }
  const keep = new Set([COURSE_MANIFEST_URL, ...listed.shared.map((file) => file.url), ...Object.values(listed.courses).flatMap((files) => files.map((file) => file.url))]);
  const cache = await caches.open(COURSE_CACHE);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (!keep.has(path)) await cache.delete(request);
  }
}

self.addEventListener('install', (event) => event.waitUntil(installPrecache(event)));
self.addEventListener('activate', (event) => {
  event.waitUntil(precache.activate(event));
  event.waitUntil(pruneAudio(true).catch(() => undefined));
  event.waitUntil(pruneCourses().catch(() => undefined));
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
// The other courses' files and the list of them (never in the precache).
registerRoute(
  ({ url, request, sameOrigin }) => sameOrigin && isCourseFile(url.pathname) && request.method === 'GET' && !request.headers.has('range'),
  ({ request, event }) => courseFileFromCache(request, event),
);
registerRoute(
  ({ url, request, sameOrigin }) => sameOrigin && url.pathname === COURSE_MANIFEST_URL && request.method === 'GET',
  ({ request, event }) => courseManifest(request, event),
);
registerRoute(
  new NavigationRoute(precache.createHandlerBoundToURL('/index.html'), {
    // /api/ (measurement, later) and addresses of files (such as
    // /icons/icon-512.png) go to the network.
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  }),
);
