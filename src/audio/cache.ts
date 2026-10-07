/**
 * Where the service worker keeps recordings once they have been downloaded
 * (src/offline/sw.ts): a cache of its own, apart from the precache, which a
 * new version of the site never empties. Files are named by their hash, so
 * an unchanged recording stays and a changed one is a new file; the worker
 * deletes those no section uses any more. Pure, no imports, so the worker
 * and the page share it.
 */
export const AUDIO_CACHE = 'thinkerwell-audio-v1';

/** Every recording and timings file is under this path. */
export const AUDIO_PREFIX = '/audio/';
