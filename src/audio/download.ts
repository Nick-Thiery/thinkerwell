/**
 * "Lesson audio" in Settings: downloading every recording of the device's
 * lessons' languages at once, for Listen without the internet, and how much
 * of it is on the device (docs/notes/recorded-audio.md).
 *
 * - Each language's timings file lists its recordings and their sizes
 *   (./timings.ts). Files already on the device are skipped, so a download
 *   that was stopped, or broke off, carries on where it was.
 * - Three files at a time: a shared Wi-Fi connection stays usable.
 * - The service worker keeps each file as it passes (src/offline/sw.ts).
 *   Where no worker controls the page (a reload that bypassed it), the file
 *   is put in the same cache from here.
 * - Stopping keeps what has been downloaded.
 */
import { AUDIO_CACHE } from './cache';
import { loadTimings } from './load';
import { audioUrl, recordingsOf } from './recordings';

export interface AudioFile {
  url: string;
  bytes: number;
}

export interface DownloadProgress {
  /** Bytes on the device, of `total`. */
  done: number;
  total: number;
}

export type DownloadResult = 'done' | 'stopped' | 'failed';

/** At most this many recordings download at once. */
export const DOWNLOAD_CONCURRENCY = 3;

/** True where recordings can be kept on the device (the Cache API exists here). */
export function canKeepAudio(): boolean {
  return typeof caches !== 'undefined' && typeof caches.open === 'function';
}

/** Every recording of these languages, with its size: from the timings files (downloaded if needed). */
export async function audioFiles(langs: readonly string[], signal?: AbortSignal): Promise<AudioFile[]> {
  const files: AudioFile[] = [];
  for (const lang of langs) {
    const timings = await loadTimings(lang, signal);
    if (!timings) continue;
    const seen = new Set<string>();
    for (const section of Object.values(timings.sections)) {
      if (seen.has(section.f)) continue;
      seen.add(section.f);
      files.push({ url: audioUrl(lang, section.f), bytes: section.b ?? 0 });
    }
  }
  return files;
}

/** The total size of these languages' recordings (./recordings.json): known without downloading anything. */
export function audioTotal(langs: readonly string[]): number {
  return langs.reduce((sum, lang) => sum + (recordingsOf(lang)?.bytes ?? 0), 0);
}

/**
 * How much of these languages' recordings is on the device, in bytes. Exact
 * once the timings files are on the device too; before that, the size of the
 * recordings kept under each language.
 */
export async function storedAudio(langs: readonly string[]): Promise<number> {
  if (!canKeepAudio()) return 0;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = (await cache.keys()).map((request) => new URL(request.url).pathname);
    let stored = 0;
    for (const lang of langs) {
      const index = recordingsOf(lang);
      if (!index) continue;
      const mine = keys.filter((path) => path.startsWith(audioUrl(lang, '')) && path.endsWith('.mp3'));
      if (mine.length === 0) continue;
      const timingsResponse = await cache.match(index.timings);
      if (timingsResponse) {
        const timings = (await timingsResponse.json()) as { sections: Record<string, { f: string; b?: number }> };
        const sizes = new Map(Object.values(timings.sections).map((section) => [audioUrl(lang, section.f), section.b ?? 0]));
        for (const path of mine) stored += sizes.get(path) ?? 0;
      } else {
        for (const path of mine) stored += Number((await cache.match(path))?.headers.get('content-length') ?? 0);
      }
    }
    return Math.min(stored, audioTotal(langs));
  } catch {
    return 0;
  }
}

/**
 * Downloads every recording of these languages that isn't on the device yet.
 * Reports progress as files arrive. 'failed' when any file couldn't be
 * downloaded (the rest are kept); 'stopped' when `signal` stopped it.
 */
export async function downloadAudio(
  langs: readonly string[],
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: DownloadProgress) => void } = {},
): Promise<DownloadResult> {
  if (!canKeepAudio()) return 'failed';
  let files: AudioFile[];
  let cache: Cache;
  try {
    files = await audioFiles(langs, signal);
    cache = await caches.open(AUDIO_CACHE);
  } catch {
    return signal?.aborted ? 'stopped' : 'failed';
  }
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  let done = 0;
  const queue: AudioFile[] = [];
  for (const file of files) {
    if (await cache.match(file.url)) done += file.bytes;
    else queue.push(file);
  }
  onProgress?.({ done, total });
  let failed = false;
  const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;

  const worker = async (): Promise<void> => {
    for (let file = queue.shift(); file && !signal?.aborted; file = queue.shift()) {
      try {
        const response = await fetch(file.url, { signal });
        if (!response.ok) throw new Error(`${file.url}: ${response.status}`);
        if (controlled) await response.blob();
        else await cache.put(file.url, response);
        done += file.bytes;
        onProgress?.({ done, total });
      } catch {
        if (!signal?.aborted) failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
  if (signal?.aborted) return 'stopped';
  return failed ? 'failed' : 'done';
}
