// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../locales';
import { woff2CodePoints } from './woff2Cmap';

const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), 'utf8');
const arabic = read('arabic.css');
const vietnamese = read('vietnamese.css');
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

/** Every letter of the Vietnamese alphabet, capital and small: 12 vowels with the 5 tones or none, and đ. */
function vietnameseLetters(): string[] {
  const tones = ['', '\u0300', '\u0309', '\u0303', '\u0301', '\u0323'];
  const letters = ['đ', 'Đ'];
  for (const vowel of 'aăâeêioôơuưy') {
    for (const tone of tones) letters.push((vowel + tone).normalize('NFC'), (vowel.toUpperCase() + tone).normalize('NFC'));
  }
  return letters;
}

const nodeModules = path.join(import.meta.dirname, '../../../node_modules/@fontsource');
const fontFile = (family: string, subset: string, style: string) =>
  path.join(nodeModules, family, 'files', `${family}-${subset}-${style}.woff2`);
const firstCodePoint = (letter: string) => letter.codePointAt(0)!;

describe('the Vietnamese font (Be Vietnam Pro)', () => {
  const faces_ = faces(vietnamese);
  const letters = vietnameseLetters();

  it('has the whole alphabet, every one a single letter', () => {
    expect(letters).toHaveLength(146);
    for (const letter of letters) expect([...letter]).toHaveLength(1);
  });

  it("is needed: the site's own two fonts lack 96 of those letters (ơ, ư and every dotted or hooked vowel)", () => {
    const atkinson = new Set(['latin', 'latin-ext'].flatMap((subset) => [...woff2CodePoints(fontFile('atkinson-hyperlegible-next', subset, '400-normal'))]));
    const funnel = new Set(['latin', 'latin-ext'].flatMap((subset) => [...woff2CodePoints(fontFile('funnel-display', subset, '500-normal'))]));
    const missing = (font: Set<number>) => letters.filter((letter) => !font.has(firstCodePoint(letter)));
    expect(missing(atkinson)).toHaveLength(96);
    expect(missing(funnel)).toHaveLength(96);
    for (const letter of ['ơ', 'Ơ', 'ư', 'Ư', 'ạ', 'ế', 'ộ', 'ỹ']) expect(missing(atkinson), letter).toContain(letter);
  });

  it('is one family, in the weights the site uses, from the self-hosted package, woff2 only', () => {
    expect(new Set(faces_.map((face) => face.family))).toEqual(new Set(['Be Vietnam Pro']));
    expect(new Set(faces_.map((face) => `${face.weight} ${face.style}`))).toEqual(new Set(['400 normal', '400 italic', '500 normal', '600 normal', '700 normal']));
    // latin, latin-ext and vietnamese in each: 5 x 3 files.
    expect(faces_).toHaveLength(15);
    for (const face of faces_) {
      expect(face.src).toMatch(/^url\("@fontsource\/be-vietnam-pro\/files\/be-vietnam-pro-(latin|latin-ext|vietnamese)-\d00-(normal|italic)\.woff2"\) format\("woff2"\)$/);
    }
  });

  it("covers the Vietnamese alphabet: the unicode ranges name it, and the files declared for each letter have its glyph", () => {
    for (const face of faces_.filter((candidate) => candidate.src.includes('-vietnamese-'))) {
      expect(covers(face, 0x1ea0), 'first of the Vietnamese block').toBe(true);
      expect(covers(face, 0x1ef9), 'last of the Vietnamese block').toBe(true);
    }
    const styles = [...new Set(faces_.map((face) => `${face.weight}-${face.style}`))];
    for (const style of styles) {
      const group = faces_.filter((face) => `${face.weight}-${face.style}` === style);
      for (const letter of letters) {
        // Where two faces list a letter, the one declared last is used.
        const used = group.filter((face) => covers(face, firstCodePoint(letter))).at(-1);
        expect(used, `${letter} (${style}) has a face`).toBeDefined();
        const file = /files\/(be-vietnam-pro-[a-z-]+-\d00-(?:normal|italic))\.woff2/.exec(used!.src)![1]!;
        expect(woff2CodePoints(path.join(nodeModules, 'be-vietnam-pro/files', `${file}.woff2`)).has(firstCodePoint(letter)), `${letter} in ${file}`).toBe(true);
      }
    }
  });

  it('also has the plain Latin letters, digits and punctuation in every weight, so a word never mixes two families', () => {
    const basic = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?'’\"-–—()/%&";
    for (const style of ['400-normal', '400-italic', '500-normal', '600-normal', '700-normal']) {
      const group = faces_.filter((face) => `${face.weight}-${face.style}` === style);
      for (const character of basic) {
        const used = group.filter((face) => covers(face, firstCodePoint(character))).at(-1);
        expect(used, `${character} (${style})`).toBeDefined();
        const file = /files\/(be-vietnam-pro-[a-z-]+-\d00-(?:normal|italic))\.woff2/.exec(used!.src)![1]!;
        expect(woff2CodePoints(path.join(nodeModules, 'be-vietnam-pro/files', `${file}.woff2`)).has(firstCodePoint(character)), `${character} in ${file}`).toBe(true);
      }
    }
  });

  it("puts Be Vietnam Pro first in both font stacks while Vietnamese is shown, with the site's fonts behind it", () => {
    expect(vietnamese).toMatch(/:root:lang\(vi\)[^{]*\{[^}]*--font-display:\s*"Be Vietnam Pro", "Funnel Display"/);
    expect(vietnamese).toMatch(/:root:lang\(vi\)[^{]*\{[^}]*--font-body:\s*"Be Vietnam Pro", "Atkinson Hyperlegible Next"/);
  });

  it('leaves English lessons in the fonts they are set in, and sets no font size, so nothing goes below 14px', () => {
    expect(vietnamese).toMatch(/:root:lang\(vi\) :lang\(en\) \{[^}]*--font-body:\s*"Atkinson Hyperlegible Next"/);
    expect(vietnamese).not.toMatch(/font-size/);
  });

  it("isn't in the site's own stylesheet or the Arabic one, so it never loads for English", () => {
    expect(site).not.toMatch(/be-vietnam-pro|Be Vietnam Pro/i);
    expect(arabic).not.toMatch(/be-vietnam-pro|Be Vietnam Pro/i);
  });

  it('is the font of every language with the vietnamese key, which is not offered yet', () => {
    const wanting = LOCALES.filter((locale) => locale.font === 'vietnamese');
    expect(wanting.map((locale) => locale.code)).toEqual(['vi']);
    expect(wanting.every((locale) => !locale.ready)).toBe(true);
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
