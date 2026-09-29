/**
 * The course content, from content/*.json, bundled at build time. Everything
 * here is synchronous.
 *
 * The files are checked against the zod schemas in ./schema, on their own
 * and against each other (./load.ts), by the content plugin in
 * vite.config.ts whenever they are built, served or tested, and by
 * content.test.ts. A file with a problem stops the build. So here, in the
 * browser, they are used as they are, and zod stays out of the bundle.
 *
 * Course order: sections in their `number` order, then the lesson numbers
 * each section lists. "Next lesson" is worked out from that order.
 *
 * The module-level getters are English. For a language with translated
 * content (Indonesian), contentFor() gives the same getters over the
 * translated lessons, section checks and pictures; components use
 * useContent() (./useContent.ts), which picks the one for the language on
 * screen.
 */
import courseJson from '../../content/course.json';
import { assembleContent } from './assemble';
import { ContentError } from './errors';
import type { CourseFile, Lesson, QuizFile, Section, SectionId } from './schema';
import { applyTranslation } from './translation';
import type { ContentTranslation } from '../i18n/core';

// Types only: a value from ./schema would bring zod into the browser bundle
// (see ./quizSkills.ts and keepZodOutOfTheBrowser in vite.config.ts).
export type * from './schema';
export { QUIZ_SKILLS } from './quizSkills';
export * from './stages';
export { ContentError } from './errors';
export type { LoadedContent } from './assemble';
export { applyTranslation, missingTranslations, translatableStrings, translationProblems } from './translation';

const lessonModules = import.meta.glob<Lesson>('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
});

const quizModules = import.meta.glob<QuizFile>('../../content/quizzes/*.json', {
  eager: true,
  import: 'default',
});

/** Built URL of every picture, keyed as a lesson's `visual.src` (e.g. "visuals/L01.svg"). */
const visualUrls = new Map(
  Object.entries(
    import.meta.glob<string>('../../content/visuals/*.svg', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.replace(/^.*\/content\/visuals\//, 'visuals/'), url]),
);

/** The content's getters, for one language. */
export interface Content {
  /** The whole of course.json: course details, sections, practice options, fiction label. */
  readonly getCourse: () => CourseFile;
  /** The four sections in order. */
  readonly getSections: () => readonly Section[];
  readonly getSection: (id: string) => Section | undefined;
  /** Every lesson in course order. */
  readonly getLessons: () => readonly Lesson[];
  /** A section's lessons in order. */
  readonly getSectionLessons: (sectionId: string) => Lesson[];
  readonly getLesson: (id: string) => Lesson | undefined;
  /** Looks up a lesson by its Base44 id (l6, history-scale, ...). */
  readonly getLessonByOldId: (oldId: string) => Lesson | undefined;
  readonly getLessonByNumber: (number: number) => Lesson | undefined;
  /** The section a lesson belongs to. */
  readonly getLessonSection: (lesson: Lesson) => Section;
  /** The lesson after this one in course order, or undefined after the last lesson (or for an unknown id). */
  readonly getNextLesson: (id: string) => Lesson | undefined;
  /** The lesson before this one in course order, or undefined before the first lesson (or for an unknown id). */
  readonly getPreviousLesson: (id: string) => Lesson | undefined;
  /** The last lesson of a section, whose completion leads to the section check. */
  readonly isLastLessonInSection: (lesson: Lesson) => boolean;
  /** The built URL of a lesson picture (`visual.src`), or undefined if the file doesn't exist. */
  readonly getVisualUrl: (src: string) => string | undefined;
  /** Every section check, one per section. */
  readonly getQuizzes: () => readonly QuizFile[];
  /** A section's check (content/quizzes/<sectionId>.json). */
  readonly getQuiz: (sectionId: string) => QuizFile | undefined;
}

function createContent(
  course: CourseFile,
  lessonList: readonly Lesson[],
  quizzes: readonly QuizFile[],
  pictureUrls: ReadonlyMap<string, string>,
): Content {
  const content = assembleContent(course, lessonList);
  const quizzesBySection = new Map(quizzes.map((q) => [q.section, q]));
  const lessonsById = new Map(content.lessons.map((l) => [l.id, l]));
  const lessonsByOldId = new Map(content.lessons.map((l) => [l.oldId, l]));
  const lessonsByNumber = new Map(content.lessons.map((l) => [l.number, l]));
  const sectionsById = new Map(content.sections.map((s) => [s.id, s]));
  const indexById = new Map(content.lessons.map((l, i) => [l.id, i]));
  const getSection = (id: string) => sectionsById.get(id as SectionId);
  const getLessonSection = (lesson: Lesson) => {
    const section = sectionsById.get(lesson.section);
    if (!section) throw new ContentError(`Lesson ${lesson.number} has unknown section "${lesson.section}".`);
    return section;
  };
  return {
    getCourse: () => content.course,
    getSections: () => content.sections,
    getSection,
    getLessons: () => content.lessons,
    getSectionLessons: (sectionId) => getSection(sectionId)?.lessons.flatMap((n) => lessonsByNumber.get(n) ?? []) ?? [],
    getLesson: (id) => lessonsById.get(id),
    getLessonByOldId: (oldId) => lessonsByOldId.get(oldId),
    getLessonByNumber: (number) => lessonsByNumber.get(number),
    getLessonSection,
    getNextLesson: (id) => {
      const index = indexById.get(id);
      return index === undefined ? undefined : content.lessons[index + 1];
    },
    getPreviousLesson: (id) => {
      const index = indexById.get(id);
      return index === undefined || index === 0 ? undefined : content.lessons[index - 1];
    },
    isLastLessonInSection: (lesson) => {
      const section = getLessonSection(lesson);
      return section.lessons[section.lessons.length - 1] === lesson.number;
    },
    getVisualUrl: (src) => pictureUrls.get(src),
    getQuizzes: () => quizzes,
    getQuiz: (sectionId) => quizzesBySection.get(sectionId as SectionId),
  };
}

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** The English content. */
export const englishContent = createContent(
  courseJson as unknown as CourseFile,
  Object.values(lessonModules),
  Object.values(quizModules),
  visualUrls,
);

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
  getNextLesson,
  getPreviousLesson,
  isLastLessonInSection,
  getVisualUrl,
  getQuizzes,
  getQuiz,
} = englishContent;

const translated = new WeakMap<ContentTranslation, Content>();

/**
 * The content in a language with translated content: its lessons, section
 * checks and course.json laid over the English (./translation.ts), and its
 * own pictures. The build has checked them (vite.config.ts, checkContent).
 * A file or picture a translation lacks stays English. English without one.
 */
export function contentFor(translation: ContentTranslation | undefined): Content {
  if (!translation) return englishContent;
  let found = translated.get(translation);
  if (!found) {
    const lessons = Object.entries(lessonModules).map(([path, lesson]) => applyTranslation(lesson, translation.lessons[fileName(path)]));
    const quizzes = Object.entries(quizModules).map(([path, quiz]) => applyTranslation(quiz, translation.quizzes[fileName(path)]));
    const pictures = new Map([...visualUrls, ...Object.entries(translation.visuals)]);
    found = createContent(applyTranslation(courseJson as unknown as CourseFile, translation.course), lessons, quizzes, pictures);
    translated.set(translation, found);
  }
  return found;
}
