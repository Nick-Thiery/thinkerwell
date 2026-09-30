import { describe, expect, it } from 'vitest';
import {
  contentLocale,
  findLocale,
  formatLocale,
  LOCALE_CODE_PATTERN,
  LOCALES,
  PSEUDO_LOCALES,
  readyLocales,
  resolveLocale,
  SOURCE_LOCALE,
  type LocaleDefinition,
} from './locales';

const fixture: LocaleDefinition[] = [
  ...LOCALES,
  { code: 'xx', englishName: 'Test', endonym: 'Test', dir: 'ltr', font: 'latin', ready: true },
];

describe('the language list', () => {
  it('starts with English, and offers English and Indonesian today', () => {
    expect(LOCALES[0]).toMatchObject({ code: 'en', dir: 'ltr', font: 'latin', ready: true });
    expect(readyLocales().map((locale) => locale.code)).toEqual(['en', 'id']);
    expect(SOURCE_LOCALE).toBe('en');
  });

  it('lists the languages the pilot plan names, and Indonesian, the only one ready', () => {
    expect(LOCALES.map((locale) => [locale.code, locale.dir, locale.font, locale.ready])).toEqual([
      ['en', 'ltr', 'latin', true],
      ['fa-AF', 'rtl', 'arabic', false],
      ['ar', 'rtl', 'arabic', false],
      ['so', 'ltr', 'latin', false],
      ['id', 'ltr', 'latin', true],
    ]);
  });

  it("gives every language its own name as CLDR writes it, and its English name", () => {
    // Where the name people use differs from CLDR's, and why.
    const ownNames: Record<string, string> = { id: 'Bahasa Indonesia' }; // CLDR: "Indonesia"
    for (const locale of LOCALES) {
      expect(ownNames[locale.code] ?? new Intl.DisplayNames([locale.code], { type: 'language' }).of(locale.code), locale.code).toBe(locale.endonym);
      expect(new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.code), locale.code).toBe(locale.englishName);
    }
  });

  it('has unique codes that look like language tags', () => {
    const codes = [...LOCALES, ...PSEUDO_LOCALES].map((locale) => locale.code.toLowerCase());
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(new RegExp(LOCALE_CODE_PATTERN.source, 'i'));
  });

  it('never offers a pseudo-language, even one marked ready', () => {
    expect(PSEUDO_LOCALES.every((locale) => locale.pseudo && !locale.ready)).toBe(true);
    expect(readyLocales([...LOCALES, { ...PSEUDO_LOCALES[0]!, ready: true }]).map((locale) => locale.code)).toEqual(['en', 'id']);
  });

  it('formats pseudo-languages like English and every other language as itself', () => {
    expect(formatLocale(findLocale('en-XA')!)).toBe('en');
    expect(formatLocale(findLocale('ar-XB')!)).toBe('en');
    expect(formatLocale(findLocale('fa-AF')!)).toBe('fa-AF');
  });
});

describe('findLocale', () => {
  it('finds real and pseudo-languages, ignoring case', () => {
    expect(findLocale('fa-af')?.code).toBe('fa-AF');
    expect(findLocale('EN-xa')?.code).toBe('en-XA');
    expect(findLocale('ar-XB')?.dir).toBe('rtl');
  });

  it('returns undefined for anything else', () => {
    expect(findLocale('de')).toBeUndefined();
    expect(findLocale('')).toBeUndefined();
    expect(findLocale(null)).toBeUndefined();
    expect(findLocale(undefined)).toBeUndefined();
  });
});

describe('resolveLocale', () => {
  it('is English with no choice, or only choices that are not offered', () => {
    expect(resolveLocale([]).code).toBe('en');
    expect(resolveLocale([null, undefined]).code).toBe('en');
    expect(resolveLocale(['fa-AF', 'so']).code).toBe('en');
    expect(resolveLocale(['en-XA']).code).toBe('en');
    expect(resolveLocale(['klingon']).code).toBe('en');
  });

  it("takes the learner's choice first, then the device's", () => {
    const offered = readyLocales(fixture);
    expect(resolveLocale(['xx', 'en'], offered).code).toBe('xx');
    expect(resolveLocale(['en', 'xx'], offered).code).toBe('en');
    expect(resolveLocale([undefined, 'xx'], offered).code).toBe('xx');
    expect(resolveLocale(['so', 'xx'], offered).code).toBe('xx');
  });
});

describe('languages whose lessons are translated too', () => {
  it('is only Indonesian, which reads and listens in id-ID', () => {
    expect(LOCALES.filter((locale) => locale.content).map((locale) => [locale.code, locale.speechLang])).toEqual([['id', 'id-ID']]);
  });

  it('gives the lessons in Indonesian for Indonesian, and in English for every other language', () => {
    expect(contentLocale(findLocale('id')!).code).toBe('id');
    for (const code of ['en', 'fa-AF', 'ar', 'so', 'en-XA', 'ar-XB']) expect(contentLocale(findLocale(code)!).code).toBe('en');
  });
});
