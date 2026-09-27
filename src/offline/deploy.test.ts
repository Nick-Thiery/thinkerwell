import { describe, expect, it } from 'vitest';
import vercelJson from '../../vercel.json';

// Vercel (vercel.json): the site stays a single-page app, and a new service
// worker is always seen, so a new version can be offered (docs/notes/phase-6.md).
interface VercelConfig {
  rewrites: Array<{ source: string; destination: string }>;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

const vercel: VercelConfig = vercelJson;

function header(source: string, key: string): string | undefined {
  return vercel.headers.find((rule) => rule.source === source)?.headers.find((h) => h.key === key)?.value;
}

describe('vercel.json', () => {
  it('sends every address to index.html (files on disk still come first)', () => {
    expect(vercel.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });

  it('never lets a browser keep an old service worker or manifest without asking', () => {
    expect(header('/sw.js', 'Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(header('/manifest.webmanifest', 'Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('caches the hashed build files for a year', () => {
    expect(header('/assets/(.*)', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(header('/workbox-(.*).js', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
  });
});
