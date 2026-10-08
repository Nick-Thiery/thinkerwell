/**
 * One course's content and its getters, for any course
 * (src/content/courses.ts): Our World's (./index.ts) and a preview course's
 * (src/courses/digital-world/content.ts). No content is imported here, so a
 * course's code can build its own without bringing Our World's lessons.
 *
 * The lesson pages (the player, its print view and teacher guide) read a
 * course through LessonContent, the widest type, from useLessonContent()
 * (./useContent.ts): Our World's, unless a preview course's pages provide
 * their own. Everything else reads Our World through useContent().
 */
import type { IconName } from '../components/ds/icons';
import { ContentError } from './errors';
import type { AnyCourseFile, CourseFile, CourseLesson, CourseSection, Lesson, QuizFile, Section, SectionId } from './schema';

/** How a section looks: one of the design system's four section tints, and its icon (always beside its name). */
export interface SectionLook {
  tone: SectionId;
  icon: IconName;
}

/** A course's getters, typed by its lessons (L), sections (S) and course.json (C). */
export interface CourseContent<L extends CourseLesson, S extends CourseSection, C extends AnyCourseFile> {
  /** The course's id (src/content/courses.ts). */
  readonly courseId: string;
  /** The whole of course.json: course details, sections, practice options, fiction label. */
  readonly getCourse: () => C;
  /** The sections in order. */
  readonly getSections: () => readonly S[];
  readonly getSection: (id: string) => S | undefined;
  /** Every lesson in course order. */
  readonly getLessons: () => readonly L[];
  /** A section's lessons in order. */
  readonly getSectionLessons: (sectionId: string) => L[];
  readonly getLesson: (id: string) => L | undefined;
  /** Looks up a lesson by its Base44 id (l6, history-scale, ...). Only Our World has them. */
  readonly getLessonByOldId: (oldId: string) => L | undefined;
  readonly getLessonByNumber: (number: number) => L | undefined;
  /** The section a lesson belongs to. */
  readonly getLessonSection: (lesson: Pick<CourseLesson, 'number' | 'section'>) => S;
  /** The lesson after this one in course order, or undefined after the last lesson (or for an unknown id). */
  readonly getNextLesson: (id: string) => L | undefined;
  /** The lesson before this one in course order, or undefined before the first lesson (or for an unknown id). */
  readonly getPreviousLesson: (id: string) => L | undefined;
  /** The last lesson of a section, whose completion leads to the section check. */
  readonly isLastLessonInSection: (lesson: Pick<CourseLesson, 'number' | 'section'>) => boolean;
  /** The built URL of a lesson picture (`visual.src`), or undefined if the file doesn't exist (yet). */
  readonly getVisualUrl: (src: string) => string | undefined;
  /** True when the course has section checks and certificates (Our World); a preview course has none yet. */
  readonly hasSectionChecks: boolean;
  /** A section's tint and icon. */
  readonly sectionLook: (sectionId: string) => SectionLook;
  /** The course map, open at a section: /course#history, /course/digital-world#how-ai-works. */
  readonly coursePath: (sectionId?: string) => string;
  /** The Educators page, at a section (Our World). A preview course has none: its teacher guides go back to its map. */
  readonly educatorsPath?: (sectionId?: string) => string;
}

/** Any course, as the lesson pages read it. Our World's content is one too. */
export type LessonContent = CourseContent<CourseLesson, CourseSection, AnyCourseFile>;

/** Our World's: its lessons and sections, with its section checks. */
export interface OurWorldContent extends CourseContent<Lesson, Section, CourseFile> {
  /** Every section check, one per section. */
  readonly getQuizzes: () => readonly QuizFile[];
  /** A section's check (content/quizzes/<sectionId>.json). */
  readonly getQuiz: (sectionId: string) => QuizFile | undefined;
}

export interface CourseOptions {
  courseId: string;
  /** Built URL of every picture, keyed as a lesson's `visual.src`. */
  pictureUrls: ReadonlyMap<string, string>;
  hasSectionChecks: boolean;
  sectionLook: (sectionId: string) => SectionLook;
  coursePath: (sectionId?: string) => string;
  educatorsPath?: (sectionId?: string) => string;
}

/**
 * A course's getters over its course.json and lessons, which the build has
 * already checked (./load.ts). Course order: sections in their `number`
 * order, then the lesson numbers each section lists.
 */
export function createCourseContent<L extends CourseLesson, C extends AnyCourseFile>(
  course: C,
  lessonList: readonly L[],
  options: CourseOptions,
): CourseContent<L, C['sections'][number], C> {
  type S = C['sections'][number];
  const sections = [...course.sections].sort((a, b) => a.number - b.number) as S[];
  const byNumber = new Map(lessonList.map((lesson) => [lesson.number, lesson]));
  const lessons = sections.flatMap((section) => section.lessons.flatMap((n) => byNumber.get(n) ?? []));
  const lessonsById = new Map(lessons.map((l) => [l.id, l]));
  const lessonsByOldId = new Map(lessons.flatMap((l) => (l.oldId === null ? [] : [[l.oldId, l] as const])));
  const sectionsById = new Map(sections.map((s) => [s.id, s]));
  const indexById = new Map(lessons.map((l, i) => [l.id, i]));
  const getSection = (id: string) => sectionsById.get(id);
  const getLessonSection = (lesson: Pick<CourseLesson, 'number' | 'section'>) => {
    const section = sectionsById.get(lesson.section);
    if (!section) throw new ContentError(`Lesson ${lesson.number} has unknown section "${lesson.section}".`);
    return section;
  };
  return {
    courseId: options.courseId,
    getCourse: () => course,
    getSections: () => sections,
    getSection,
    getLessons: () => lessons,
    getSectionLessons: (sectionId) => getSection(sectionId)?.lessons.flatMap((n) => byNumber.get(n) ?? []) ?? [],
    getLesson: (id) => lessonsById.get(id),
    getLessonByOldId: (oldId) => lessonsByOldId.get(oldId),
    getLessonByNumber: (number) => byNumber.get(number),
    getLessonSection,
    getNextLesson: (id) => {
      const index = indexById.get(id);
      return index === undefined ? undefined : lessons[index + 1];
    },
    getPreviousLesson: (id) => {
      const index = indexById.get(id);
      return index === undefined || index === 0 ? undefined : lessons[index - 1];
    },
    isLastLessonInSection: (lesson) => {
      const section = getLessonSection(lesson);
      return section.lessons[section.lessons.length - 1] === lesson.number;
    },
    getVisualUrl: (src) => options.pictureUrls.get(src),
    hasSectionChecks: options.hasSectionChecks,
    sectionLook: options.sectionLook,
    coursePath: options.coursePath,
    educatorsPath: options.educatorsPath,
  };
}
