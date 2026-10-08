// With the extension: vite.config.ts loads this through ./load.ts.
import type { AnyCourseFile, CourseFile, Lesson } from './schema.ts';

export interface LoadedContent<L extends Pick<Lesson, 'number'> = Lesson, C extends AnyCourseFile = CourseFile> {
  course: C;
  sections: C['sections'][number][];
  /** In course order. */
  lessons: L[];
}

/**
 * Puts the content in course order: sections in their `number` order, then
 * each section's lessons in the order it lists them. It checks nothing:
 * ./load.ts does that, at build time and in the tests, before the content
 * reaches the app.
 */
export function assembleContent<L extends Pick<Lesson, 'number'>, C extends AnyCourseFile = CourseFile>(course: C, lessons: readonly L[]): LoadedContent<L, C> {
  const sections = [...course.sections].sort((a, b) => a.number - b.number);
  const byNumber = new Map(lessons.map((lesson) => [lesson.number, lesson]));
  return {
    course,
    sections,
    lessons: sections.flatMap((section) => section.lessons.flatMap((n) => byNumber.get(n) ?? [])),
  };
}
