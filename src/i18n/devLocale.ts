/**
 * The test-language switch: ?locale=<code> on any URL, like ?dir=rtl
 * (./direction.ts). It is remembered for the browser tab (sessionStorage)
 * until you visit any URL with ?locale=en (or an empty ?locale=).
 *
 *  - In development (`npm run dev`): any language in ./locales.ts, ready or
 *    not, so a translator can see their file in place, and the
 *    pseudo-languages (en-XA, ar-XB).
 *  - In a production build: only the pseudo-languages, and only in a
 *    browser driven by automated tests (navigator.webdriver), for the
 *    end-to-end checks in e2e/languages.spec.ts. Learners never get them,
 *    and nothing is saved.
 */
import { findLocale, LOCALES, PSEUDO_LOCALES, SOURCE_LOCALE } from './locales';

export const DEV_LOCALE_STORAGE_KEY = 'tw-dev-locale';

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** True in a browser driven by automated tests (Playwright, WebDriver). */
export function isAutomated(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

/** The codes the switch accepts here. */
export function switchableLocales(isDev: boolean, automated: boolean): string[] {
  if (isDev) return [...LOCALES, ...PSEUDO_LOCALES].filter((locale) => locale.code !== SOURCE_LOCALE).map((locale) => locale.code);
  return automated ? PSEUDO_LOCALES.map((locale) => locale.code) : [];
}

/**
 * The language forced by ?locale= (remembering it), or the one saved earlier
 * in this tab, or null. Always null where the switch is off.
 */
export function readDevLocale(search: string, isDev: boolean = import.meta.env.DEV, automated: boolean = isAutomated()): string | null {
  const allowed = switchableLocales(isDev, automated);
  if (allowed.length === 0) return null;
  const pick = (code: string | null | undefined) => {
    const match = findLocale(code);
    return match && allowed.includes(match.code) ? match.code : null;
  };
  const store = safeSessionStorage();
  const params = new URLSearchParams(search);
  if (params.has('locale')) {
    const code = pick(params.get('locale'));
    const off = params.get('locale') === '' || findLocale(params.get('locale'))?.code === SOURCE_LOCALE;
    try {
      if (code) store?.setItem(DEV_LOCALE_STORAGE_KEY, code);
      else if (off) store?.removeItem(DEV_LOCALE_STORAGE_KEY);
    } catch {
      // Storage can be blocked; the switch then lasts for this page only.
    }
    if (code || off) return code;
  }
  try {
    return pick(store?.getItem(DEV_LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}
