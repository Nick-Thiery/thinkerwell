import { describe, expect, it } from 'vitest';
import vercelJson from '../../vercel.json';

// Vercel (vercel.json): the site stays a single-page app, and a new service
// worker is always seen, so a new version can be offered (docs/notes/phase-6.md).
// Phase 8: the security headers, and a rewrite that never answers a file's
// address with the page. The import steps are in docs/LAUNCH_CHECKLIST.md.
interface VercelConfig {
  framework: string;
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  rewrites: Array<{ source: string; destination: string }>;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

const vercel: VercelConfig = vercelJson;

function header(source: string, key: string): string | undefined {
  return vercel.headers.find((rule) => rule.source === source)?.headers.find((h) => h.key === key)?.value;
}

/** Every Cache-Control value vercel.json sends for an address (its sources here read as regular expressions too). */
function cacheControl(pathname: string): string[] {
  return vercel.headers
    .filter((rule) => new RegExp(`^${rule.source}$`).test(pathname))
    .flatMap((rule) => rule.headers.filter((h) => h.key === 'Cache-Control').map((h) => h.value));
}

/** Vercel's source patterns are path-to-regexp; this one is a single raw regex group, so it reads as a RegExp. */
function rewritten(pathname: string): boolean {
  return vercel.rewrites.some((rule) => new RegExp(`^${rule.source}$`).test(pathname));
}

describe('vercel.json', () => {
  it('builds with the Vite preset, from the lockfile, into dist', () => {
    expect(vercel).toMatchObject({ framework: 'vite', installCommand: 'npm ci', buildCommand: 'npm run build', outputDirectory: 'dist' });
  });

  it('sends every page address to index.html (files on disk still come first)', () => {
    expect(vercel.rewrites).toHaveLength(1);
    expect(vercel.rewrites[0]!.destination).toBe('/index.html');
    for (const path of ['/', '/course', '/lesson/towns-near-rivers/read', '/lesson/l6', '/section/civics/check', '/journal/print', '/certificate/section/history', '/certificate/course', '/whatever']) {
      expect(rewritten(path), path).toBe(true);
    }
  });

  it('never answers the address of a file with the page, so a missing file is a 404, not HTML', () => {
    // Otherwise an old tab (or the service worker) asking for a file from an
    // earlier version would get index.html as JavaScript. Same rule as the
    // service worker's navigateFallbackDenylist (vite.config.ts).
    for (const path of ['/assets/index-abc123.js', '/assets/L10-abc.svg', '/sw.js', '/workbox-9c191d2f.js', '/manifest.webmanifest', '/images/x.png', '/icons/icon-192.png']) {
      expect(rewritten(path), path).toBe(false);
    }
  });

  it('never lets a browser keep an old page, service worker or manifest without asking', () => {
    for (const path of ['/', '/index.html', '/course', '/lesson/towns-near-rivers/read', '/sw.js', '/manifest.webmanifest']) {
      expect(cacheControl(path), path).toEqual(['public, max-age=0, must-revalidate']);
    }
  });

  it('caches the hashed build files for a year, and only those', () => {
    // docs/notes/slow-internet.md: a hashed file never changes, so a browser never asks for it again.
    for (const path of ['/assets/index-abc123.js', '/assets/index-abc123.css', '/assets/L10-abc.svg', '/assets/eczar-wordmark-500-abc.woff2']) {
      expect(cacheControl(path), path).toEqual(['public, max-age=31536000, immutable']);
    }
    // Files without a hash in their name get Vercel's default (revalidate).
    for (const path of ['/images/sdg-04.png', '/icons/icon-192.png', '/social-card.png']) expect(cacheControl(path), path).toEqual([]);
  });

  describe('security headers, on every response', () => {
    const csp = header('/(.*)', 'Content-Security-Policy') ?? '';
    const directives = Object.fromEntries(
      csp
        .split(';')
        .map((part) => part.trim().split(/\s+/))
        .map(([name, ...values]) => [name, values]),
    ) as Record<string, string[]>;

    it('lets the page load only from this site, and frame only the youtube-nocookie player', () => {
      expect(directives['default-src']).toEqual(["'self'"]);
      expect(directives['script-src']).toEqual(["'self'"]);
      expect(directives['style-src']).toEqual(["'self'"]);
      expect(directives['font-src']).toEqual(["'self'"]);
      expect(directives['connect-src']).toEqual(["'self'"]);
      expect(directives['worker-src']).toEqual(["'self'"]);
      expect(directives['manifest-src']).toEqual(["'self'"]);
      expect(directives['frame-src']).toEqual(['https://www.youtube-nocookie.com']);
      // Two small lesson pictures are inlined into the JavaScript as data: URLs; recordings play from blob: URLs.
      expect(directives['img-src']).toEqual(["'self'", 'data:']);
      expect(directives['media-src']).toEqual(["'self'", 'blob:']);
      expect(directives['object-src']).toEqual(["'none'"]);
      expect(directives['frame-ancestors']).toEqual(["'none'"]);
      expect(csp).not.toMatch(/unsafe-|\*/);
    });

    it('sends no referrer, allows the microphone only here, and keeps the site out of other frames', () => {
      expect(header('/(.*)', 'Referrer-Policy')).toBe('no-referrer');
      expect(header('/(.*)', 'Permissions-Policy')).toContain('microphone=(self)');
      expect(header('/(.*)', 'Permissions-Policy')).toContain('camera=()');
      expect(header('/(.*)', 'X-Frame-Options')).toBe('DENY');
      expect(header('/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
      expect(header('/(.*)', 'Strict-Transport-Security')).toMatch(/^max-age=\d+/);
    });
  });
});
