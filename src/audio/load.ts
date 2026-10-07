/**
 * Getting a section's recording, ready to play (docs/notes/recorded-audio.md).
 *
 * - The language's timings file comes first (once per page; the service
 *   worker keeps it), then the section's recording, as a whole file turned
 *   into a blob: URL. Playing from a blob means seeking works the same in
 *   every browser (Safari asks for byte ranges, which a cached file can't
 *   answer) and the recording is never half there.
 * - A recording is used only when its fingerprint matches what the section
 *   says now: a lesson edited since it was recorded reads with the device's
 *   voice instead, never with words that aren't on screen.
 * - Both files are only ever fetched from this site (/audio/), never from
 *   anywhere else.
 */
import { AUDIO_CACHE } from './cache';
import { audioUrl, recordingsOf, type RecordingRef } from './recordings';
import type { LanguageTimings, PieceTime } from './timings';

export interface LoadedRecording {
  ref: RecordingRef;
  times: readonly PieceTime[];
  /** A blob: URL for the audio element. */
  url: string;
  /** Lets the blob go. */
  release: () => void;
}

export interface LoadOptions {
  signal?: AbortSignal;
  /** Only a recording already on this device (Save data): don't download one. */
  onlyStored?: boolean;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

let fetchFile: Fetch = (input, init) => fetch(input, init);
const timingsByUrl = new Map<string, Promise<LanguageTimings>>();

/** True when this file is in the recordings' cache (false where there is no Cache API). */
export async function isStored(url: string): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    return Boolean(await caches.match(url, { cacheName: AUDIO_CACHE }));
  } catch {
    return false;
  }
}

/** The timings of one language's recordings, or null when it has none. Fetched once per page. */
export function loadTimings(lang: string, signal?: AbortSignal): Promise<LanguageTimings | null> {
  const url = recordingsOf(lang)?.timings;
  if (!url) return Promise.resolve(null);
  let pending = timingsByUrl.get(url);
  if (!pending) {
    pending = fetchFile(url, { signal }).then(async (response) => {
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      return (await response.json()) as LanguageTimings;
    });
    // A failed download (offline, say) is tried again next time.
    pending.catch(() => timingsByUrl.delete(url));
    timingsByUrl.set(url, pending);
  }
  return pending;
}

/** The section's recording and its timings, or null when there isn't one to play here and now. */
export async function loadRecording(ref: RecordingRef, { signal, onlyStored = false }: LoadOptions = {}): Promise<LoadedRecording | null> {
  try {
    const timingsUrl = recordingsOf(ref.lang)?.timings;
    if (!timingsUrl || (onlyStored && !(await isStored(timingsUrl)))) return null;
    const timings = await loadTimings(ref.lang, signal);
    const section = timings?.sections[ref.key];
    if (!section || section.h !== ref.hash) return null;
    const url = audioUrl(ref.lang, section.f);
    if (onlyStored && !(await isStored(url))) return null;
    const response = await fetchFile(url, { signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    const objectUrl = URL.createObjectURL(blob);
    return { ref, times: section.t, url: objectUrl, release: () => URL.revokeObjectURL(objectUrl) };
  } catch {
    return null;
  }
}

/** Downloads a section's recording ahead of time (the next part), so the service worker has it. Never fails. */
export function prefetchRecording(ref: RecordingRef): void {
  void loadTimings(ref.lang)
    .then((timings) => {
      const section = timings?.sections[ref.key];
      if (!section || section.h !== ref.hash) return;
      return fetchFile(audioUrl(ref.lang, section.f)).then((response) => response.blob());
    })
    .catch(() => undefined);
}

/** For tests: how files are fetched, and forgetting the timings already loaded. */
export function setAudioFetchForTests(next: Fetch | null): void {
  fetchFile = next ?? ((input, init) => fetch(input, init));
  timingsByUrl.clear();
}
