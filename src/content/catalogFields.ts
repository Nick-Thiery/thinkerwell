// With the extension: vite.config.ts loads this (the lesson catalog plugin).
import type { Lesson } from './schema.ts';

/**
 * The lesson fields the catalog (./catalog.ts) carries: enough to list,
 * link and count lessons (home, the course map, progress, certificates)
 * without the lesson text, which loads only with the pages that show it.
 */
export const LESSON_CATALOG_FIELDS = ['id', 'oldId', 'number', 'section', 'title', 'essentialQuestion', 'estimatedMinutes'] as const;

/** A lesson as the catalog has it. A full Lesson is one too. */
export type LessonSummary = Pick<Lesson, (typeof LESSON_CATALOG_FIELDS)[number]>;

/**
 * What the course choice needs to know about a course other than Our World
 * without loading it: its name in each language it is translated into,
 * and how many lessons and sections it has. Made at build time by the lesson
 * catalog plugin in vite.config.ts, from the course's own files.
 */
export interface CourseSummary {
  /** Its name by language code: always 'en', and 'id' and 'ms' where translated. */
  titles: Record<string, string>;
  lessons: number;
  sections: number;
  /** Every lesson's id, in lesson order, so finished lessons can be counted without loading the course. */
  lessonIds: readonly string[];
}
