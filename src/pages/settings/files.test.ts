import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, readFileText, REVOKE_AFTER_MS } from './files';

/** URL's own static methods, put back after each test (jsdom has no object URLs of its own). */
const urlStatics: Record<string, unknown> = {
  createObjectURL: Reflect.get(URL, 'createObjectURL'),
  revokeObjectURL: Reflect.get(URL, 'revokeObjectURL'),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.assign(URL, urlStatics);
});

describe('downloadFile', () => {
  it('downloads through a temporary <a download> and revokes the object URL a little later', async () => {
    vi.useFakeTimers();
    const blobs: Blob[] = [];
    const create = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:thinkerwell/1';
    });
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
      expect(document.body.contains(this)).toBe(true);
    });

    downloadFile('thinkerwell-amina-2026-09-28.json', '{"a":1}', 'application/json');

    expect(clicked).toHaveLength(1);
    expect(clicked[0]!.download).toBe('thinkerwell-amina-2026-09-28.json');
    expect(clicked[0]!.getAttribute('href')).toBe('blob:thinkerwell/1');
    // The link is gone from the page at once; the URL lives on long enough for Safari to read it.
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blobs[0]!.type).toBe('application/json');
    expect(await readFileText(blobs[0]!)).toBe('{"a":1}');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_AFTER_MS);
    expect(revoke).toHaveBeenCalledWith('blob:thinkerwell/1');
  });
});

describe('readFileText', () => {
  it('reads with FileReader where Blob.text() is missing', async () => {
    const blob = new Blob(['Amina’s work'], { type: 'application/json' });
    Object.defineProperty(blob, 'text', { value: undefined });
    expect(await readFileText(blob)).toBe('Amina’s work');
  });
});
