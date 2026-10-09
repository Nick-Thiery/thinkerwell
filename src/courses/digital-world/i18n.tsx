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
import { useMemo, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/course-messages/digital-world';
import { ENGLISH, I18nContext, useI18n, withWords, type I18nContextValue, type MessageTree } from '../../i18n';

/**
 * The page's i18n with the course's own words added (in the language on
 * screen, else English: withWords, src/i18n/words.tsx) and its lessons
 * marked as English. Exported for tests.
 */
export function withCourseWords(parent: I18nContextValue, own: Readonly<Record<string, MessageTree>>): I18nContextValue {
  return {
    ...withWords(parent, own),
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
