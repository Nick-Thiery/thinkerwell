import { describe, expect, it } from 'vitest';
import { languageAssetFileName, languageChunkFileName, languageChunkName, languagePrecacheIgnores, LANGUAGE_MODULE } from './build';
import { LOCALES, type LocaleDefinition } from './locales';

describe('language chunks', () => {
  it('gives each language its own chunk, and leaves English in the app', () => {
    expect(languageChunkName('/repo/src/i18n/messages/fa-AF.json')).toBe('locale-fa-AF');
    expect(languageChunkName('C:\\repo\\src\\i18n\\messages\\so.json')).toBe('locale-so');
    expect(languageChunkName('/repo/src/i18n/messages/en.json')).toBeNull();
    expect(languageChunkName('/repo/src/i18n/messages/en.notes.json')).toBeNull();
    expect(languageChunkName('\0tw-pseudo-locale:en-XA')).toBe('pseudo-en-XA');
    expect(languageChunkName('/repo/src/i18n/pseudo.ts')).toBe('pseudo');
    expect(languageChunkName('/repo/src/i18n/fonts/arabic.css')).toBe('font-arabic');
    expect(languageChunkName('/repo/src/i18n/core.ts')).toBeNull();
    expect(languageChunkName('/repo/content/lessons/L01.json')).toBeNull();
  });

  it('matches only language modules', () => {
    expect(LANGUAGE_MODULE.test('/repo/src/i18n/messages/ar.json')).toBe(true);
    expect(LANGUAGE_MODULE.test('\0tw-pseudo-locale:ar-XB')).toBe(true);
    expect(LANGUAGE_MODULE.test('/repo/src/i18n/load.ts')).toBe(false);
  });

  it('puts each language in a folder of its own', () => {
    expect(languageChunkFileName('locale-fa-AF')).toBe('assets/locales/fa-AF/[hash].js');
    expect(languageChunkFileName('pseudo-en-XA')).toBe('assets/pseudo/[name]-[hash].js');
    expect(languageChunkFileName('pseudo')).toBe('assets/pseudo/[name]-[hash].js');
    expect(languageChunkFileName('font-arabic')).toBe('assets/fonts-arabic/[name]-[hash].js');
    expect(languageChunkFileName('index')).toBe('assets/[name]-[hash].js');
    expect(languageChunkFileName('content')).toBe('assets/[name]-[hash].js');
  });

  it('keeps the Arabic font files and stylesheet together', () => {
    expect(languageAssetFileName({ originalFileNames: ['node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2'] })).toBe(
      'assets/fonts-arabic/[name]-[hash][extname]',
    );
    expect(languageAssetFileName({ names: ['font-arabic.css'] })).toBe('assets/fonts-arabic/[name]-[hash][extname]');
    expect(languageAssetFileName({ names: ['index.css'], originalFileNames: ['index.html'] })).toBe('assets/[name]-[hash][extname]');
    expect(languageAssetFileName({ originalFileNames: ['node_modules/@fontsource/eczar/files/eczar-latin-500-normal.woff2'] })).toBe(
      'assets/[name]-[hash][extname]',
    );
  });
});

describe('what the service worker precaches', () => {
  it('today leaves out every other language, the test languages and the Arabic font', () => {
    expect(languagePrecacheIgnores([])).toEqual([
      'assets/pseudo/**',
      'assets/locales/ar/**',
      'assets/locales/fa-AF/**',
      'assets/locales/so/**',
      'assets/fonts-arabic/**',
    ]);
  });

  it('keeps a ready language and, for a right-to-left one, the Arabic font', () => {
    const dariReady: LocaleDefinition[] = LOCALES.map((locale) => (locale.code === 'fa-AF' ? { ...locale, ready: true } : locale));
    expect(languagePrecacheIgnores(['fa-AF', 'so'], dariReady)).toEqual(['assets/pseudo/**', 'assets/locales/ar/**', 'assets/locales/so/**']);
    const somaliReady: LocaleDefinition[] = LOCALES.map((locale) => (locale.code === 'so' ? { ...locale, ready: true } : locale));
    expect(languagePrecacheIgnores(['so'], somaliReady)).toContain('assets/fonts-arabic/**');
    expect(languagePrecacheIgnores(['so'], somaliReady)).not.toContain('assets/locales/so/**');
  });

  it('leaves out a message file for a language that is not listed', () => {
    expect(languagePrecacheIgnores(['ps'])).toContain('assets/locales/ps/**');
  });

  it("never mixes up codes that start alike ('fa' and 'fa-AF')", () => {
    const ignores = languagePrecacheIgnores(['fa']);
    expect(ignores).toContain('assets/locales/fa/**');
    expect(ignores.filter((glob) => glob.startsWith('assets/locales/fa')).sort()).toEqual(['assets/locales/fa-AF/**', 'assets/locales/fa/**']);
  });
});
