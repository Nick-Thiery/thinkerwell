/**
 * The language this device showed last, kept in localStorage so that after
 * a reload the page starts in it (the learner and the device's setting take
 * a moment to read from IndexedDB, and English would flash up meanwhile).
 * Only a hint: the chosen learner's language and the device's setting (the
 * learner session) always decide. It holds a language code, nothing about a
 * learner. Blocked storage just means English for that moment.
 */
import { findLocale, readyLocales, SOURCE_LOCALE } from '../i18n/locales';

export const LANGUAGE_HINT_KEY = 'tw-language';

export function readLanguageHint(): string {
  try {
    const code = window.localStorage.getItem(LANGUAGE_HINT_KEY);
    return code && findLocale(code, readyLocales()) ? code : SOURCE_LOCALE;
  } catch {
    return SOURCE_LOCALE;
  }
}

export function writeLanguageHint(code: string): void {
  try {
    if (code === SOURCE_LOCALE) window.localStorage.removeItem(LANGUAGE_HINT_KEY);
    else window.localStorage.setItem(LANGUAGE_HINT_KEY, code);
  } catch {
    // Storage blocked: the next reload starts in English for a moment.
  }
}
