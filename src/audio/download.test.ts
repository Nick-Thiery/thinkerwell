import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_CACHE } from './cache';
import { audioTotal, downloadAudio, storedAudio } from './download';
import { loadRecording, setAudioFetchForTests } from './load';
import { setRecordingsForTests } from './recordings';
import { piecesHash } from './textHash';

/** A Cache API with one cache, in memory. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const path = (request: RequestInfo | URL) => new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url, 'https://thinkerwell.test').pathname;
  const cache = {
    match: (request: RequestInfo | URL) => Promise.resolve(store.get(path(request))?.clone()),
    put: async (request: RequestInfo | URL, response: Response) => {
      store.set(path(request), new Response(await response.arrayBuffer(), { headers: response.headers }));
    },
    keys: () => Promise.resolve([...store.keys()].map((key) => new Request(`https://thinkerwell.test${key}`))),
    delete: (request: RequestInfo | URL) => Promise.resolve(store.delete(path(request))),
  };
  const caches = {
    open: vi.fn((name: string) => {
      expect(name).toBe(AUDIO_CACHE);
      return Promise.resolve(cache);
    }),
    match: (request: RequestInfo | URL) => cache.match(request),
  };
  return { store, caches };
}

const TIMINGS = '/audio/en/timings.1.json';
const SECTIONS = {
  'a/standard/1': { f: 'a-standard-1.x.mp3', h: 'h1', b: 3000, t: [[0.1, 1]] },
  'a/standard/2': { f: 'a-standard-2.x.mp3', h: 'h2', b: 2000, t: [[0.1, 1]] },
  'a/simpler/1': { f: 'a-simpler-1.x.mp3', h: 'h3', b: 1000, t: [0, [0.1, 1]] },
  sample: { f: 'sample.x.mp3', h: piecesHash(['This is the voice that reads the lessons aloud.']), b: 500, t: [[0.1, 1]] },
};

let files: ReturnType<typeof fakeCaches>;
let requested: string[];
let failing: Set<string>;

beforeEach(() => {
  files = fakeCaches();
  vi.stubGlobal('caches', files.caches);
  requested = [];
  failing = new Set();
  setRecordingsForTests({ en: { timings: TIMINGS, files: 4, bytes: 6500 } });
  const fetchFile = (url: string) => {
    requested.push(url);
    if (failing.has(url)) return Promise.resolve(new Response('', { status: 503 }));
    if (url === TIMINGS) return Promise.resolve(new Response(JSON.stringify({ lang: 'en', sections: SECTIONS })));
    const section = Object.values(SECTIONS).find((s) => url.endsWith(s.f));
    return Promise.resolve(section ? new Response(new Uint8Array(section.b)) : new Response('', { status: 404 }));
  };
  setAudioFetchForTests(fetchFile);
  vi.stubGlobal('fetch', vi.fn(fetchFile));
});

afterEach(() => vi.unstubAllGlobals());

describe('downloading the lesson audio', () => {
  it('downloads every recording of the language, with progress, and keeps it', async () => {
    const progress: number[] = [];
    const result = await downloadAudio(['en'], { onProgress: ({ done, total }) => progress.push(done / total) });
    expect(result).toBe('done');
    expect([...files.store.keys()].sort()).toEqual([
      '/audio/en/a-simpler-1.x.mp3',
      '/audio/en/a-standard-1.x.mp3',
      '/audio/en/a-standard-2.x.mp3',
      '/audio/en/sample.x.mp3',
    ]);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    expect(audioTotal(['en'])).toBe(6500);
  });

  it('skips what is already on the device', async () => {
    await files.caches.open(AUDIO_CACHE).then((cache) => cache.put('/audio/en/a-standard-1.x.mp3', new Response(new Uint8Array(3000))));
    const progress: number[] = [];
    await downloadAudio(['en'], { onProgress: ({ done }) => progress.push(done) });
    expect(progress[0]).toBe(3000);
    expect(requested).not.toContain('/audio/en/a-standard-1.x.mp3');
  });

  it('stops when asked, keeping what arrived', async () => {
    const stopper = new AbortController();
    const result = await downloadAudio(['en'], {
      signal: stopper.signal,
      onProgress: ({ done }) => {
        if (done > 0) stopper.abort();
      },
    });
    expect(result).toBe('stopped');
    expect(files.store.size).toBeGreaterThan(0);
    expect(files.store.size).toBeLessThan(4);
  });

  it('says when some files failed, and keeps the rest', async () => {
    failing.add('/audio/en/a-standard-2.x.mp3');
    expect(await downloadAudio(['en'])).toBe('failed');
    expect(files.store.has('/audio/en/a-standard-1.x.mp3')).toBe(true);
    expect(files.store.has('/audio/en/a-standard-2.x.mp3')).toBe(false);
  });

  it('says how much is on the device', async () => {
    expect(await storedAudio(['en'])).toBe(0);
    const cache = await files.caches.open(AUDIO_CACHE);
    await cache.put('/audio/en/a-standard-1.x.mp3', new Response(new Uint8Array(3000), { headers: { 'content-length': '3000' } }));
    // Before the timings are kept: the size of the recordings kept.
    expect(await storedAudio(['en'])).toBe(3000);
    await cache.put(TIMINGS, new Response(JSON.stringify({ lang: 'en', sections: SECTIONS })));
    await cache.put('/audio/en/old-file.y.mp3', new Response(new Uint8Array(10)));
    // With them: only the recordings in use count.
    expect(await storedAudio(['en'])).toBe(3000);
  });
});

describe('loading one recording', () => {
  it('plays a recording only when it says what is on screen', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }));
    expect(await loadRecording({ lang: 'en', key: 'a/standard/1', hash: 'h1' })).toMatchObject({ url: 'blob:x', times: [[0.1, 1]] });
    expect(await loadRecording({ lang: 'en', key: 'a/standard/1', hash: 'changed' })).toBeNull();
    expect(await loadRecording({ lang: 'en', key: 'no/such/part', hash: 'h1' })).toBeNull();
    expect(await loadRecording({ lang: 'id', key: 'a/standard/1', hash: 'h1' })).toBeNull();
  });

  it('with only what is stored, downloads nothing', async () => {
    expect(await loadRecording({ lang: 'en', key: 'a/standard/1', hash: 'h1' }, { onlyStored: true })).toBeNull();
    expect(requested).toEqual([]);
  });

  it('is null, not an error, when the download fails (offline)', async () => {
    setAudioFetchForTests(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await loadRecording({ lang: 'en', key: 'a/standard/1', hash: 'h1' })).toBeNull();
  });
});
