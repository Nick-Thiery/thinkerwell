/**
 * The course without the lesson text: the course and its sections
 * (content/course.json), and each lesson's id, number, section, title,
 * question and time (./catalogFields.ts). Everything here is synchronous
 * and small, so every page can use it.
 *
 * The lessons themselves and the section checks (./index.ts) are much
 * bigger (about 70 kB compressed), and only the pages that show them load
 * them: the lesson, print, journal, section check and educator pages, each
 * a lazy route (src/app/routes.tsx). So a first visit to the home page or
 * the course map doesn't wait for them (docs/notes/slow-internet.md).
 * vite.config.ts stops the build if a lesson file reaches the first chunk.
 *
 * Course order: sections in their `number` order, then the lesson numbers
 * each section lists (the same as ./index.ts).
 */
import courseJson from '../../content/course.json';
import catalogData from 'virtual:thinkerwell/lesson-catalog';
import { assembleContent } from './assemble';
import type { LessonSummary } from './catalogFields';
import { ContentError } from './errors';
import type { CourseFile, Section, SectionId } from './schema';

export type { LessonSummary } from './catalogFields';
export type { CourseFile, Section, SectionId } from './schema';

/** As the lesson catalog plugin in vite.config.ts makes it, from the checked content files. */
const catalog = catalogData as {
  /** Every lesson's catalog fields (./catalogFields.ts), in file order. */
  lessons: LessonSummary[];
  /** How many questions each section check has. */
  quizQuestions: Partial<Record<SectionId, number>>;
};

const content = assembleContent(courseJson as unknown as CourseFile, catalog.lessons);
const lessonsById = new Map(content.lessons.map((l) => [l.id, l]));
const lessonsByOldId = new Map(content.lessons.map((l) => [l.oldId, l]));
const lessonsByNumber = new Map(content.lessons.map((l) => [l.number, l]));
const sectionsById = new Map(content.sections.map((s) => [s.id, s]));

/** The whole of course.json: course details, sections, practice options, fiction label. */
export function getCourse(): CourseFile {
  return content.course;
}

/** The four sections in order. */
export function getSections(): readonly Section[] {
  return content.sections;
}

export function getSection(id: string): Section | undefined {
  return sectionsById.get(id as SectionId);
}

/** Every lesson in course order. */
export function getLessons(): readonly LessonSummary[] {
  return content.lessons;
}

/** A section's lessons in order. */
export function getSectionLessons(sectionId: string): LessonSummary[] {
  const section = getSection(sectionId);
  if (!section) return [];
  return section.lessons.flatMap((n) => lessonsByNumber.get(n) ?? []);
}

export function getLesson(id: string): LessonSummary | undefined {
  return lessonsById.get(id);
}

/** Looks up a lesson by its Base44 id (l6, history-scale, ...). */
export function getLessonByOldId(oldId: string): LessonSummary | undefined {
  return lessonsByOldId.get(oldId);
}

export function getLessonByNumber(number: number): LessonSummary | undefined {
  return lessonsByNumber.get(number);
}

/** The section a lesson belongs to. */
export function getLessonSection(lesson: Pick<LessonSummary, 'number' | 'section'>): Section {
  const section = sectionsById.get(lesson.section);
  if (!section) throw new ContentError(`Lesson ${lesson.number} has unknown section "${lesson.section}".`);
  return section;
}

/** How many questions a section's check has (0 for an unknown section). */
export function getQuizQuestionCount(sectionId: string): number {
  return catalog.quizQuestions[sectionId as SectionId] ?? 0;
}
