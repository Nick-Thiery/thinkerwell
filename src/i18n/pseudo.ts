/**
 * Pseudo-languages for testing (src/i18n/locales.ts, PSEUDO_LOCALES). Each
 * one is made from en.json when the site is built or tested (the
 * pseudo-locale plugin in vite.config.ts), never written by hand, so it
 * always has every key. The end-to-end tests (e2e/languages.spec.ts) walk
 * every page in them:
 *
 *  - en-XA, "longer": every letter accented ("Ŝţåŕţ"), every word about a
 *    third longer, and each message wrapped in ⟦ ⟧. English that doesn't
 *    come from en.json stays plain and stands out, a layout that can't take
 *    longer words breaks, and text cut off at the end loses its ⟧.
 *  - ar-XB, "right to left": each word written backwards with right-to-left
 *    override marks and the message wrapped in right-to-left marks, so it
 *    reads from the right like Arabic script, in Latin letters that every
 *    font has.
 *
 * {placeholders} are left exactly as they are. No imports, so the build,
 * the tests and the translator tools can all use it.
 */

export const PSEUDO_OPEN = '⟦';
export const PSEUDO_CLOSE = '⟧';

const ACCENTED: Record<string, string> = {
  a: 'å', b: 'ƀ', c: 'ç', d: 'ď', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ',
  n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'û', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ',
  N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Û', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

/** How much longer en-XA makes each word: translations often run a third longer than English. */
export const PSEUDO_GROWTH = 0.35;

const PLACEHOLDER = /(\{\w+\})/;
const WORD = /[A-Za-z]+/g;
const VOWEL = /[aeiouAEIOU]/;

/** One English word, accented and about a third longer (its vowels doubled, or its last letter where it has none). */
function longerWord(word: string): string {
  let extra = Math.round(word.length * PSEUDO_GROWTH);
  const letters = [...word].map((letter) => [letter]);
  const vowels = letters.filter(([letter]) => VOWEL.test(letter!));
  const growing = vowels.length > 0 ? vowels : [letters[letters.length - 1]!];
  for (let i = 0; extra > 0; i = (i + 1) % growing.length, extra--) growing[i]!.push(growing[i]![0]!);
  return letters.flat().map((letter) => ACCENTED[letter] ?? letter).join('');
}

/** Applies `change` to the text between {placeholders}, leaving them as they are. */
function outsidePlaceholders(text: string, change: (part: string) => string): string {
  return text
    .split(PLACEHOLDER)
    .map((part) => (PLACEHOLDER.test(part) ? part : change(part)))
    .join('');
}

/** Accents and lengthens text, with no brackets: for formatted dates and lists in en-XA. */
export function accentText(text: string): string {
  return text.replace(WORD, longerWord);
}

/** en-XA: one message, accented, longer and wrapped in ⟦ ⟧. */
export function pseudoLonger(message: string): string {
  return `${PSEUDO_OPEN}${outsidePlaceholders(message, accentText)}${PSEUDO_CLOSE}`;
}

const RLM = '\u200F';
const RLO = '\u202E';
const PDF = '\u202C';

/** Each word written backwards with a right-to-left override, with no marks around the whole: for formatted dates and lists in ar-XB. */
export function rightToLeftText(text: string): string {
  return text.replace(WORD, (word) => `${RLO}${word}${PDF}`);
}

/** ar-XB: one message, right to left. */
export function pseudoRightToLeft(message: string): string {
  return `${RLM}${outsidePlaceholders(message, rightToLeftText)}${RLM}`;
}

/** How each pseudo-language changes one message, and one formatted date or list. */
export const PSEUDO_TRANSFORMS: Record<string, { message: (text: string) => string; formatted: (text: string) => string }> = {
  'en-XA': { message: pseudoLonger, formatted: accentText },
  'ar-XB': { message: pseudoRightToLeft, formatted: rightToLeftText },
};

/** A whole message file (strings, plural objects and groups), with every string changed. */
export function pseudoMessages<T>(messages: T, transform: (text: string) => string): T {
  if (typeof messages === 'string') return transform(messages) as T;
  if (messages && typeof messages === 'object') {
    return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, pseudoMessages(value, transform)])) as T;
  }
  return messages;
}
