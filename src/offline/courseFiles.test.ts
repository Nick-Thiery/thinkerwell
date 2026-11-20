import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCourses, storedCourseFiles } from './courseFiles';
import type { CourseFile } from './courseCache';

// "Save the courses" in Settings (src/pages/settings/CourseFilesSetting.tsx) looks in
// the cache as soon as the download returns. Where a service worker controls the
// page, the worker keeps its own copy only after it has answered (sw.ts,
// courseFileFromCache), so the download must keep every file itself, or the last
// few could be missing from that look and the course shown as "partly saved".

/** A cache that only ever holds what the page itself put there. */
function fakeCaches(): Map<string, Response> {
  const kept = new Map<string, Response>();
  const cache = {
    match: (url: string) => Promise.resolve(kept.get(url)),
    put: async (url: string, response: Response) => {
      kept.set(url, response);
      await Promise.resolve();
    },
  };
  vi.stubGlobal('caches', { open: () => Promise.resolve(cache) });
  return kept;
}

const FILES: CourseFile[] = Array.from({ length: 7 }, (_, index) => ({ url: `/assets/preview/course/file-${index}.js`, bytes: 1000 + index }));

describe('downloadCourses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps every file in the cache before it says "done", with a service worker in control too', async () => {
    const kept = fakeCaches();
    vi.stubGlobal('fetch', (url: string) => Promise.resolve(new Response(`file ${url}`, { status: 200 })));
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { controller: {} } });
    const progress: number[] = [];

    await expect(downloadCourses(FILES, { onProgress: ({ done }) => progress.push(done) })).resolves.toBe('done');

    expect([...kept.keys()].sort()).toEqual(FILES.map((file) => file.url).sort());
    await expect(storedCourseFiles(FILES)).resolves.toEqual({ count: 7, bytes: FILES.reduce((sum, file) => sum + file.bytes, 0) });
    expect(progress.at(-1)).toBe(FILES.reduce((sum, file) => sum + file.bytes, 0));
  });

  it('says "failed" when a file does not arrive, and keeps the rest', async () => {
    const kept = fakeCaches();
    vi.stubGlobal('fetch', (url: string) => Promise.resolve(new Response('x', { status: url.endsWith('file-3.js') ? 503 : 200 })));

    await expect(downloadCourses(FILES)).resolves.toBe('failed');
    expect(kept.size).toBe(6);
    expect(kept.has('/assets/preview/course/file-3.js')).toBe(false);
  });
});
