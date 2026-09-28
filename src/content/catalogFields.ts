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
