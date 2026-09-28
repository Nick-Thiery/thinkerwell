/**
 * Loading a language's messages. English is bundled (./core.ts); every other
 * language is its own small chunk, fetched the first time someone uses it:
 *
 *  - Real languages: src/i18n/messages/<code>.json (made with
 *    `npm run i18n:import`). The service worker precaches the chunk of every
 *    `ready` language (vite.config.ts), so a learner's language works
 *    offline like the rest of the course. A language with no file yet
 *    loads as empty, so everything falls back to English.
 *  - Pseudo-languages for testing (./pseudo.ts): made from en.json by the
 *    pseudo-locale plugin in vite.config.ts. Never precached.
 *
 * Nothing here downloads anything for an English-only visit.
 */
import { ENGLISH, type LoadedLocale, type MessageTree } from './core';
import { findLocale, SOURCE_LOCALE } from './locales';

/** src/i18n/messages/<code>.json for every language but English, each loaded on first use. */
const messageFiles = import.meta.glob<MessageTree>(['./messages/*.json', '!./messages/en.json', '!./messages/en.notes.json'], {
  import: 'default',
});

interface PseudoModule {
  default: MessageTree;
  decorate: (text: string) => string;
}

/** The pseudo-languages, made from en.json at build time (vite.config.ts, pseudoLocales). */
const pseudoFiles: Record<string, () => Promise<PseudoModule>> = {
  'en-XA': () => import('virtual:tw-pseudo-locale/en-XA'),
  'ar-XB': () => import('virtual:tw-pseudo-locale/ar-XB'),
};

const loaded = new Map<string, LoadedLocale>([[SOURCE_LOCALE, ENGLISH]]);
const loading = new Map<string, Promise<LoadedLocale>>();

/** The language if it has already been loaded (English always has), else undefined. */
export function loadedLocale(code: string): LoadedLocale | undefined {
  const definition = findLocale(code);
  return definition ? loaded.get(definition.code) : undefined;
}

/**
 * Loads a language's messages once and keeps them. Rejects for a code that
 * isn't in src/i18n/locales.ts; the caller then stays in English.
 */
export function loadLocale(code: string): Promise<LoadedLocale> {
  const definition = findLocale(code);
  if (!definition) return Promise.reject(new Error(`Unknown language: ${code}`));
  const done = loaded.get(definition.code);
  if (done) return Promise.resolve(done);
  let pending = loading.get(definition.code);
  if (!pending) {
    pending = fetchLocale(definition.code).then(
      (locale) => {
        loaded.set(definition.code, locale);
        loading.delete(definition.code);
        return locale;
      },
      (error: unknown) => {
        loading.delete(definition.code);
        throw error;
      },
    );
    loading.set(definition.code, pending);
  }
  return pending;
}

async function fetchLocale(code: string): Promise<LoadedLocale> {
  const definition = findLocale(code)!;
  const pseudo = pseudoFiles[code];
  if (pseudo) {
    const module = await pseudo();
    return { definition, messages: module.default, decorate: module.decorate };
  }
  const file = messageFiles[`./messages/${code}.json`];
  return { definition, messages: file ? await file() : {} };
}

/** Codes that have a message file in this build, for tests. */
export function messageFileCodes(): string[] {
  return Object.keys(messageFiles).map((path) => path.replace(/^\.\/messages\/(.+)\.json$/, '$1'));
}
