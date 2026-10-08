import { createContext, useContext } from 'react';
import { useI18n } from '../i18n';
import type { LessonContent } from './courseContent';
import { contentFor, type Content } from './index';

/**
 * The lessons and section checks in the language on screen: translated for
 * a language whose lessons are translated (Indonesian), English otherwise.
 * Only for the lazily loaded pages that show lessons (like ./index.ts).
 * This is always Our World's; the lesson pages read useLessonContent().
 */
export function useContent(): Content {
  return contentFor(useI18n().content);
}

const CourseContentContext = createContext<LessonContent | null>(null);

/**
 * Gives the lesson pages below it another course's content: a preview
 * course's pages (src/courses/) wrap the shared lesson player, print view
 * and teacher guide in it. Without it they show Our World.
 */
export const CourseContentProvider = CourseContentContext.Provider;

/**
 * The course the lesson pages (the player, its print view, the teacher
 * guide) are showing: the one a CourseContentProvider above gives, or Our
 * World in the language on screen.
 */
export function useLessonContent(): LessonContent {
  const course = useContext(CourseContentContext);
  const ourWorld = useContent();
  return course ?? ourWorld;
}
