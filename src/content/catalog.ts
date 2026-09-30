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
 *
 * The module-level getters are English. For a language with translated
 * content (Indonesian), catalogFor() gives the same getters over the
 * translated text; components use useCatalog() (./useCatalog.ts), which
 * picks the one for the language on screen.
 */
import courseJson from '../../content/course.json';
import catalogData from 'virtual:thinkerwell/lesson-catalog';
import { assembleContent } from './assemble';
import type { LessonSummary } from './catalogFields';
import { ContentError } from './errors';
import type { CourseFile, Section, SectionId } from './schema';
import { applyTranslation } from './translation';
import type { ContentTranslation } from '../i18n/core';

export type { LessonSummary } from './catalogFields';
export type { CourseFile, Section, SectionId } from './schema';

/** As the lesson catalog plugin in vite.config.ts makes it, from the checked content files. */
const catalog = catalogData as {
  /** Every lesson's catalog fields (./catalogFields.ts), in file order. */
  lessons: LessonSummary[];
  /** How many questions each section check has. */
  quizQuestions: Partial<Record<SectionId, number>>;
  /** The embedded videos' YouTube channels, once each, in order. */
  videoChannels: string[];
};

/** The YouTube channels of the lessons' videos (the About page's credits). The same in every language. */
export function getVideoChannels(): readonly string[] {
  return catalog.videoChannels;
}

/** The catalog's getters, for one language. */
export interface Catalog {
  /** The whole of course.json: course details, sections, practice options, fiction label. */
  readonly getCourse: () => CourseFile;
  /** The four sections in order. */
  readonly getSections: () => readonly Section[];
  readonly getSection: (id: string) => Section | undefined;
  /** Every lesson in course order. */
  readonly getLessons: () => readonly LessonSummary[];
  /** A section's lessons in order. */
  readonly getSectionLessons: (sectionId: string) => LessonSummary[];
  readonly getLesson: (id: string) => LessonSummary | undefined;
  /** Looks up a lesson by its Base44 id (l6, history-scale, ...). */
  readonly getLessonByOldId: (oldId: string) => LessonSummary | undefined;
  readonly getLessonByNumber: (number: number) => LessonSummary | undefined;
  /** The section a lesson belongs to. */
  readonly getLessonSection: (lesson: Pick<LessonSummary, 'number' | 'section'>) => Section;
  /** How many questions a section's check has (0 for an unknown section). */
  readonly getQuizQuestionCount: (sectionId: string) => number;
}

function createCatalog(course: CourseFile, lessonSummaries: readonly LessonSummary[]): Catalog {
  const content = assembleContent(course, lessonSummaries);
  const lessonsById = new Map(content.lessons.map((l) => [l.id, l]));
  const lessonsByOldId = new Map(content.lessons.map((l) => [l.oldId, l]));
  const lessonsByNumber = new Map(content.lessons.map((l) => [l.number, l]));
  const sectionsById = new Map(content.sections.map((s) => [s.id, s]));
  const getSection = (id: string) => sectionsById.get(id as SectionId);
  return {
    getCourse: () => content.course,
    getSections: () => content.sections,
    getSection,
    getLessons: () => content.lessons,
    getSectionLessons: (sectionId) => getSection(sectionId)?.lessons.flatMap((n) => lessonsByNumber.get(n) ?? []) ?? [],
    getLesson: (id) => lessonsById.get(id),
    getLessonByOldId: (oldId) => lessonsByOldId.get(oldId),
    getLessonByNumber: (number) => lessonsByNumber.get(number),
    getLessonSection: (lesson) => {
      const section = sectionsById.get(lesson.section);
      if (!section) throw new ContentError(`Lesson ${lesson.number} has unknown section "${lesson.section}".`);
      return section;
    },
    getQuizQuestionCount: (sectionId) => catalog.quizQuestions[sectionId as SectionId] ?? 0,
  };
}

/** The English catalog. */
export const englishCatalog = createCatalog(courseJson as unknown as CourseFile, catalog.lessons);

export const {
  getCourse,
  getSections,
  getSection,
  getLessons,
  getSectionLessons,
  getLesson,
  getLessonByOldId,
  getLessonByNumber,
  getLessonSection,
  getQuizQuestionCount,
} = englishCatalog;

const translated = new WeakMap<ContentTranslation, Catalog>();

/**
 * The catalog in a language with translated content: its course.json and
 * each lesson's title, question and the rest laid over the English (./translation.ts).
 * A lesson with no translation file stays English. English without one.
 */
export function catalogFor(translation: ContentTranslation | undefined): Catalog {
  if (!translation) return englishCatalog;
  let found = translated.get(translation);
  if (!found) {
    const byFile = new Map(Object.entries(translation.lessons));
    const summaries = catalog.lessons.map((lesson) => {
      const file = `L${String(lesson.number).padStart(2, '0')}.json`;
      return applyTranslation(lesson, byFile.get(file));
    });
    found = createCatalog(applyTranslation(courseJson as unknown as CourseFile, translation.course), summaries);
    translated.set(translation, found);
  }
  return found;
}
