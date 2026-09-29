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
import { ENGLISH, type ContentTranslation, type LoadedLocale, type MessageTree } from './core';
import { findLocale, SOURCE_LOCALE } from './locales';

/** src/i18n/messages/<code>.json for every language but English, each loaded on first use. */
const messageFiles = import.meta.glob<MessageTree>(['./messages/*.json', '!./messages/en.json', '!./messages/en.notes.json'], {
  import: 'default',
});

/**
 * content/<code>/: the translated course, lessons, section checks and
 * pictures of a language marked `content`, each loaded on first use. They
 * go in the language's own chunk (src/i18n/build.ts), fetched with its
 * messages.
 */
const contentFiles = import.meta.glob<unknown>(
  ['../../content/*/course.json', '../../content/*/lessons/*.json', '../../content/*/quizzes/*.json'],
  { import: 'default' },
);
const visualFiles = import.meta.glob<string>('../../content/*/visuals/*.svg', { query: '?url', import: 'default' });

/** Loads every content/<code>/ file of one language. */
async function fetchContent(code: string): Promise<ContentTranslation> {
  const prefix = `../../content/${code}/`;
  const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
  const load = async <T,>(files: Record<string, () => Promise<T>>, dir: string) =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(files)
          .filter(([path]) => path.startsWith(`${prefix}${dir}/`))
          .map(async ([path, file]) => [fileName(path), await file()] as const),
      ),
    ) as Record<string, T>;
  const course = contentFiles[`${prefix}course.json`];
  const [courseTranslation, lessons, quizzes, visuals] = await Promise.all([
    course ? course() : Promise.resolve({}),
    load(contentFiles, 'lessons'),
    load(contentFiles, 'quizzes'),
    load(visualFiles, 'visuals'),
  ]);
  return {
    course: courseTranslation,
    lessons,
    quizzes,
    visuals: Object.fromEntries(Object.entries(visuals).map(([name, url]) => [`visuals/${name}`, url])),
  };
}

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
  const [messages, content] = await Promise.all([
    file ? file() : Promise.resolve({}),
    definition.content ? fetchContent(definition.code) : Promise.resolve(undefined),
  ]);
  return content ? { definition, messages, content } : { definition, messages };
}

/** Codes that have a message file in this build, for tests. */
export function messageFileCodes(): string[] {
  return Object.keys(messageFiles).map((path) => path.replace(/^\.\/messages\/(.+)\.json$/, '$1'));
}
