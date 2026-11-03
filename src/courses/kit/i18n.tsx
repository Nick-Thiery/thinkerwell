/**
 * A preview course's words, and its English lessons in any language.
 *
 * Two groups of en.json and the other message files: `previewCourse`, what
 * every preview course's pages share (the banner, the course choice, the
 * switch page), and the course's own (`digitalWorld`, `southeastAsia`: its
 * `messages` in src/content/courses.ts). The build leaves both out of the
 * app's messages and gives them to the preview code instead (vite.config.ts),
 * so devices without a preview never download them. CourseWords puts them
 * back under the course's pages (withWords, src/i18n/words.tsx).
 *
 * A preview course's lessons are translated into Indonesian and Malay (as
 * Our World's are). In any other language the course text is English: marked
 * lang="en" when the interface isn't English (contentLang), read by Listen
 * and Say it as English (contentLocale), with the banner saying so. The
 * interface stays in the learner's language.
 */
import { useMemo, type ReactNode } from 'react';
import kitWords from 'virtual:thinkerwell/messages/previewCourse';
import { ENGLISH, I18nContext, useI18n, withWords, type I18nContextValue, type MessageTree } from '../../i18n';

/** Only the words every preview course shares (for the course choice, which sits outside any one course's pages). */
export function withKitWords(parent: I18nContextValue): I18nContextValue {
  return withWords(parent, kitWords);
}

/**
 * The page's i18n with the shared preview words and the course's own added
 * (in the language on screen, else English), and its lessons marked as
 * English. Exported for tests.
 */
export function withCourseWords(parent: I18nContextValue, own: Readonly<Record<string, MessageTree>>, translated = false): I18nContextValue {
  const words = withWords(withWords(parent, kitWords), own);
  // Lessons translated into the language on screen are marked as the page is; otherwise they are English.
  if (translated) return words;
  return { ...words, content: undefined, contentLang: parent.englishLang, contentLocale: ENGLISH.definition };
}

/** The shared preview words, for a part of the page outside any one course (the course choice). */
export function KitWords({ children }: { children: ReactNode }) {
  const parent = useI18n();
  const value = useMemo(() => withKitWords(parent), [parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** A course's words for everything below it, and its lessons marked as English unless they are `translated` into the language on screen. */
export function CourseWords({ words, translated = false, children }: { words: Readonly<Record<string, MessageTree>>; translated?: boolean; children: ReactNode }) {
  const parent = useI18n();
  const value = useMemo(() => withCourseWords(parent, words, translated), [parent, words, translated]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
