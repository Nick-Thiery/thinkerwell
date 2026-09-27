// With the extension: vite.config.ts loads this through ./load.ts.
import type { CourseFile, Lesson, Section } from './schema.ts';

export interface LoadedContent {
  course: CourseFile;
  sections: Section[];
  /** In course order. */
  lessons: Lesson[];
}

/**
 * Puts the content in course order: sections in their `number` order, then
 * each section's lessons in the order it lists them. It checks nothing:
 * ./load.ts does that, at build time and in the tests, before the content
 * reaches the app.
 */
export function assembleContent(course: CourseFile, lessons: readonly Lesson[]): LoadedContent {
  const sections = [...course.sections].sort((a, b) => a.number - b.number);
  const byNumber = new Map(lessons.map((lesson) => [lesson.number, lesson]));
  return {
    course,
    sections,
    lessons: sections.flatMap((section) => section.lessons.flatMap((n) => byNumber.get(n) ?? [])),
  };
}
