/**
 * Every language Thinkerwell knows about, and which of them learners can
 * choose. Plain data with no imports, so the build (vite.config.ts, for the
 * offline precache) and the translator tools (tools/i18n/) read it too.
 *
 * English and Indonesian are offered. The others are listed so the build,
 * the translator kit and the checks know about them, but they are not
 * `ready`: nobody can choose them until a native speaker has translated and
 * checked every interface string (docs/TRANSLATING.md). Their message files
 * (src/i18n/messages/<code>.json) don't exist yet; `npm run i18n:import`
 * makes one.
 *
 * For most languages the lessons stay in English on purpose: the course is
 * also English practice. Only the interface (buttons, instructions) and, if
 * a lesson file has them, short glossary meanings are translated. A language
 * marked `content` (Indonesian, for the Jakarta pilot) is the exception: its
 * lessons, section checks, course text and lesson pictures are translated
 * too (content/<code>/), and learners who choose it learn in it.
 *
 * To add a language, see docs/notes/languages.md.
 */

export type Direction = 'ltr' | 'rtl';

/**
 * Which fonts a language needs. 'latin' is the site's own fonts (Funnel
 * Display, Atkinson Hyperlegible Next), which cover English and Somali.
 * 'arabic' adds Vazirmatn's Arabic-script letters for Dari/Farsi and
 * Arabic (src/i18n/fonts/arabic.css), loaded only while such a language is
 * in use.
 */
export type FontKey = 'latin' | 'arabic';

export interface LocaleDefinition {
  /** BCP 47 tag: <html lang>, the message file's name and the Intl locale. */
  code: string;
  /** The language's name in English, for the team and the translator kit. */
  englishName: string;
  /** The language's name in itself, as learners see it in a language picker (from CLDR). */
  endonym: string;
  dir: Direction;
  font: FontKey;
  /** True once every interface string is translated and checked by a native speaker. Only ready languages are offered. */
  ready: boolean;
  /**
   * The lessons, section checks, course text and lesson pictures are
   * translated too (content/<code>/, docs/notes/languages.md), so a learner
   * in this language learns in it rather than in English. The videos stay
   * in English.
   */
  content?: boolean;
  /**
   * The language tag to ask speech tools for when the lesson is in this
   * language: an on-device voice for Listen, recognition for Say it. Only
   * for a language with `content`; every other language's lessons are
   * English (en-US).
   */
  speechLang?: string;
  /** A made-up test language (src/i18n/pseudo.ts): never offered to learners. */
  pseudo?: boolean;
  /** The Intl locale for plurals, numbers and dates, when it differs from `code` (pseudo-languages format like English). */
  formatAs?: string;
}

/** The language every lesson file is written in, and the interface's own. */
export const SOURCE_LOCALE = 'en';

/**
 * Real languages. English first; then the languages the plan names for the
 * first pilot. Their endonyms are CLDR's (checked against Intl.DisplayNames
 * in locales.test.ts), not a translation, except where the name people use
 * differs (Indonesian: "Bahasa Indonesia").
 */
export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', englishName: 'English', endonym: 'English', dir: 'ltr', font: 'latin', ready: true },
  // Dari, the Persian of Afghanistan. Iranian Farsi would be 'fa', a locale of its own.
  { code: 'fa-AF', englishName: 'Dari', endonym: 'دری', dir: 'rtl', font: 'arabic', ready: false },
  { code: 'ar', englishName: 'Arabic', endonym: 'العربية', dir: 'rtl', font: 'arabic', ready: false },
  { code: 'so', englishName: 'Somali', endonym: 'Soomaali', dir: 'ltr', font: 'latin', ready: false },
  // Bahasa Indonesia, for the Jakarta pilot: the interface and the lessons.
  // Machine-drafted and cross-checked; it waits for native-speaker review
  // (docs/translation/id/) before it reaches learners.
  // Its own name as Indonesians say it: "Bahasa Indonesia" (CLDR has just "Indonesia").
  { code: 'id', englishName: 'Indonesian', endonym: 'Bahasa Indonesia', dir: 'ltr', font: 'latin', ready: true, content: true, speechLang: 'id-ID' },
];

/**
 * Test languages made from en.json when the site is built or tested
 * (src/i18n/pseudo.ts). Never offered to learners and never precached. They
 * open only with ?locale=en-XA in development, or in automated tests
 * (src/i18n/devLocale.ts).
 *  - en-XA: every letter accented, every word about a third longer, and each
 *    message wrapped in ⟦ ⟧, so English left in the code and text cut off at
 *    the end are easy to see.
 *  - ar-XB: right to left, each word turned round with right-to-left marks.
 */
export const PSEUDO_LOCALES: readonly LocaleDefinition[] = [
  { code: 'en-XA', englishName: 'Pseudo-English (longer)', endonym: 'Pseudo-English', dir: 'ltr', font: 'latin', ready: false, pseudo: true, formatAs: 'en' },
  { code: 'ar-XB', englishName: 'Pseudo right to left', endonym: 'Pseudo right to left', dir: 'rtl', font: 'arabic', ready: false, pseudo: true, formatAs: 'en' },
];

/** The languages learners can choose, English first. */
export function readyLocales(locales: readonly LocaleDefinition[] = LOCALES): LocaleDefinition[] {
  return locales.filter((locale) => locale.ready && !locale.pseudo);
}

/** A known language (real or pseudo) by its code, or undefined. Codes compare case-insensitively. */
export function findLocale(code: string | null | undefined, locales: readonly LocaleDefinition[] = [...LOCALES, ...PSEUDO_LOCALES]): LocaleDefinition | undefined {
  if (!code) return undefined;
  const wanted = code.toLowerCase();
  return locales.find((locale) => locale.code.toLowerCase() === wanted);
}

/**
 * The language the lessons are in for this interface language: its own when
 * it has translated content, otherwise English.
 */
export function contentLocale(locale: LocaleDefinition): LocaleDefinition {
  return locale.content ? locale : (findLocale(SOURCE_LOCALE) ?? LOCALES[0]!);
}

/** The Intl locale for a language's plurals, numbers and dates. */
export function formatLocale(locale: LocaleDefinition): string {
  return locale.formatAs ?? locale.code;
}

/**
 * The language to show: the first of `choices` (the learner's, then the
 * device's) that is offered, or English. A saved choice that isn't offered
 * (a language this version doesn't have ready) is skipped, never an error.
 */
export function resolveLocale(
  choices: ReadonlyArray<string | null | undefined>,
  offered: readonly LocaleDefinition[] = readyLocales(),
): LocaleDefinition {
  for (const choice of choices) {
    const match = findLocale(choice, offered);
    if (match) return match;
  }
  return findLocale(SOURCE_LOCALE, offered) ?? LOCALES[0]!;
}

/** A tag that looks like a BCP 47 language code ("so", "fa-AF", "en-XA"), for checking saved choices. */
export const LOCALE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
