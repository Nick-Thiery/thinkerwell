// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), 'utf8');
const arabic = read('arabic.css');
const site = read('../../styles/fonts.css');

interface Face {
  family: string;
  style: string;
  weight: string;
  src: string;
  ranges: Array<[number, number]>;
}

function faces(css: string): Face[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const get = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body!)?.[1]?.trim() ?? '';
    const ranges = get('unicode-range')
      .split(',')
      .filter(Boolean)
      .map((range) => {
        const [from, to] = range.trim().replace(/^U\+/i, '').split('-');
        return [parseInt(from!, 16), parseInt(to ?? from!, 16)] as [number, number];
      });
    return { family: get('font-family').replace(/"/g, ''), style: get('font-style'), weight: get('font-weight'), src: get('src'), ranges };
  });
}

const covers = (face: Face, codePoint: number) => face.ranges.some(([from, to]) => codePoint >= from && codePoint <= to);

describe('the Arabic-script font (Vazirmatn)', () => {
  const arabicFaces = faces(arabic);

  it("adds Arabic letters to the site's own two families, in every weight and style they use", () => {
    const siteFaces = faces(site).filter((face) => face.family !== 'Eczar');
    const want = new Set(siteFaces.map((face) => `${face.family} ${face.weight} ${face.style}`));
    expect(new Set(arabicFaces.map((face) => `${face.family} ${face.weight} ${face.style}`))).toEqual(want);
  });

  it('comes from the self-hosted Vazirmatn package, woff2 only', () => {
    for (const face of arabicFaces) expect(face.src).toMatch(/^url\("@fontsource\/vazirmatn\/files\/vazirmatn-arabic-\d00-normal\.woff2"\) format\("woff2"\)$/);
  });

  it('covers Arabic script, and never a Latin letter, digit or punctuation mark', () => {
    for (const face of arabicFaces) {
      expect(covers(face, 0x0627), 'alef').toBe(true);
      expect(covers(face, 0x06cc), 'Persian yeh').toBe(true);
      expect(covers(face, 0x06f1), 'Persian digit one').toBe(true);
      expect(covers(face, 0x200c), 'zero-width non-joiner').toBe(true);
      for (let codePoint = 0; codePoint <= 0x024f; codePoint++) expect(covers(face, codePoint)).toBe(false);
    }
  });

  it("isn't in the site's own stylesheet, so it never loads for English", () => {
    expect(site).not.toMatch(/@fontsource\/vazirmatn/);
  });
});

describe('Somali', () => {
  it("is written with letters the site's own fonts already have", () => {
    // The Somali Latin alphabet: the 26 basic letters, and the apostrophe for the glottal stop.
    const somali = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'’";
    const atkinson = faces(site).filter((face) => face.family === 'Atkinson Hyperlegible Next' && face.weight === '400' && face.style === 'normal');
    for (const letter of somali) expect(atkinson.some((face) => covers(face, letter.codePointAt(0)!)), letter).toBe(true);
  });
});
