/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The fonts every device downloads (and keeps for offline use) are only the
// ones pages use: docs/notes/slow-internet.md.

const stylesDir = import.meta.dirname;
const css = readFileSync(path.join(stylesDir, 'fonts.css'), 'utf8');

interface Face {
  family: string;
  weight: string;
  style: string;
  src: string;
  unicodeRange: string;
}

const faces: Face[] = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => {
  const prop = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body!)?.[1]?.trim() ?? '';
  return {
    family: prop('font-family').replace(/["']/g, ''),
    weight: prop('font-weight'),
    style: prop('font-style'),
    src: /url\("([^"]+)"\)/.exec(body!)?.[1] ?? '',
    unicodeRange: prop('unicode-range'),
  };
});

/** Every code point a unicode-range covers (U+0041, U+0100-02BA, ...). */
function codePoints(range: string): Set<number> {
  const points = new Set<number>();
  for (const part of range.split(',')) {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
    const start = parseInt(from!, 16);
    const end = to ? parseInt(to, 16) : start;
    for (let cp = start; cp <= end; cp++) points.add(cp);
  }
  return points;
}

describe('fonts.css', () => {
  it('asks only for the latin and latin-ext files, woff2 only, and the wordmark file', () => {
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face.src, face.src).toMatch(/^(@fontsource\/[\w-]+\/files\/[\w-]+-latin(-ext)?-\d{3}-(normal|italic)\.woff2|\.\/fonts\/eczar-wordmark-500\.woff2)$/);
      expect(face.unicodeRange, face.src).not.toBe('');
    }
  });

  it('draws the whole wordmark with the cut-down Eczar, so no letter falls back to Georgia', () => {
    const eczar = faces.filter((face) => face.family === 'Eczar');
    expect(eczar).toHaveLength(1);
    expect(existsSync(path.join(stylesDir, 'fonts', 'eczar-wordmark-500.woff2'))).toBe(true);
    const covered = codePoints(eczar[0]!.unicodeRange);

    // Every text drawn in Eczar: the Logo's word, and app.name in every
    // locale (the certificates). A new one needs scripts/subset_wordmark_font.py.
    const logo = readFileSync(path.join(stylesDir, '..', 'components', 'ds', 'Logo.tsx'), 'utf8');
    const texts = [...logo.matchAll(/<span key="word"[^>]*>([^<]+)<\/span>/g)].map((m) => m[1]!.trim());
    expect(texts).toEqual(['Thinkerwell']);
    const messagesDir = path.join(stylesDir, '..', 'i18n', 'messages');
    // Translator notes (en.notes.json) aren't messages; a language without app.name shows English's.
    for (const file of readdirSync(messagesDir).filter((name) => name.endsWith('.json') && !name.endsWith('.notes.json'))) {
      const name = (JSON.parse(readFileSync(path.join(messagesDir, file), 'utf8')) as { app?: { name?: string } }).app?.name;
      if (name) texts.push(name);
    }
    for (const text of texts) {
      const missing = [...text].filter((ch) => !covered.has(ch.codePointAt(0)!));
      expect(missing, `"${text}" has letters the wordmark font doesn't`).toEqual([]);
    }
  });

  it('uses Eczar only for the wordmark', () => {
    const uses: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'dev') walk(full);
        } else if (entry.name.endsWith('.css') && entry.name !== 'fonts.css') {
          const text = readFileSync(full, 'utf8');
          for (const match of text.matchAll(/([^{}]+){[^}]*font-family:\s*(var\(--font-wordmark\)|[^;]*Eczar)[^}]*}/g)) {
            uses.push(`${path.basename(full)}: ${match[1]!.trim()}`);
          }
        } else if (/\.tsx$/.test(entry.name) && !entry.name.includes('.test.')) {
          // tokens.css's .wordmark class is for the wordmark alone.
          const classes = [...readFileSync(full, 'utf8').matchAll(/className=["'`]([^"'`]*)["'`]/g)].flatMap((m) => m[1]!.split(/\s+/));
          if (classes.includes('wordmark')) uses.push(`${entry.name}: className wordmark`);
        }
      }
    };
    walk(path.join(stylesDir, '..'));
    expect(uses.sort()).toEqual([
      'CertificatePage.css: .tw-cert-wordmark',
      'Logo.css: .tw-logo span',
      'tokens.css: .wordmark',
    ]);
  });
});
