/**
 * Digital World's own interface words, and its English lessons in any
 * language.
 *
 * Its words are the `digitalWorld` group of en.json and id.json (rule 7:
 * every UI string lives there, translated like the rest). The build leaves
 * that group out of the app's messages and gives it to this chunk instead
 * (vite.config.ts, courseMessages), so devices without the preview never
 * download it. CourseWords puts them back under its pages.
 *
 * The lessons have no Indonesian yet. So under CourseWords the course text
 * is English in every language: marked lang="en" when the interface isn't
 * English (contentLang), read by Listen and Say it as English
 * (contentLocale), with the banner saying so. The interface stays in the
 * learner's language.
 */
import { Fragment, useMemo, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/course-messages/digital-world';
import {
  ENGLISH,
  formatLocale,
  formatMessage,
  formatMessageParts,
  I18nContext,
  useI18n,
  type I18nContextValue,
  type MessageTree,
} from '../../i18n';

function lookup(tree: unknown, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * The page's i18n with the course's own words added (in the language on
 * screen, else English) and its lessons marked as English. Exported for tests.
 */
export function withCourseWords(parent: I18nContextValue, own: Readonly<Record<string, MessageTree>>): I18nContextValue {
  const lang = formatLocale(parent.definition);
  /** A course word: the language's own, then the app's (the dev server and the test languages have them all), then English. */
  const resolve = (key: string): { value: unknown; lang: string } | null => {
    const mine = lookup(own[parent.locale], key);
    if (mine !== undefined) return { value: mine, lang };
    return null;
  };
  const english = (key: string) => lookup(own.en, key);
  return {
    ...parent,
    t: (key, params) => {
      const found = resolve(key);
      if (found) return formatMessage(found.value, found.lang, params) ?? key;
      const app = parent.t(key, params);
      if (app !== key) return app;
      const value = english(key);
      return value === undefined ? key : (formatMessage(value, 'en', params) ?? key);
    },
    tx: (key, params) => {
      const found = resolve(key);
      const value = found?.value ?? english(key);
      if (value === undefined) return parent.tx(key, params);
      const parts = formatMessageParts(value, found ? found.lang : 'en', params) ?? [key];
      return parts.map((part, index) => <Fragment key={index}>{part as ReactNode}</Fragment>);
    },
    // The lessons are English for now, whatever the interface's language.
    content: undefined,
    contentLang: parent.englishLang,
    contentLocale: ENGLISH.definition,
  };
}

/** Digital World's words and English lessons for everything below it. */
export function CourseWords({ children }: { children: ReactNode }) {
  const parent = useI18n();
  const value = useMemo(() => withCourseWords(parent, words), [parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
