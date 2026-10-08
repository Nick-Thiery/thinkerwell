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
import { educatorsPath } from '../app/lessonUrls';
import { SECTION_ICONS } from '../pages/course/sectionIcons';
import { createCourseContent, type OurWorldContent } from './courseContent';
import { DEFAULT_COURSE_ID } from './courses';
import type { CourseFile, Lesson, QuizFile, SectionId } from './schema';
import { applyTranslation } from './translation';
import type { ContentTranslation } from '../i18n/core';

// Types only: a value from ./schema would bring zod into the browser bundle
// (see ./quizSkills.ts and keepZodOutOfTheBrowser in vite.config.ts).
export type * from './schema';
export { QUIZ_SKILLS } from './quizSkills';
export * from './stages';
export { ContentError } from './errors';
export type { LoadedContent } from './assemble';
export type { CourseContent, LessonContent, SectionLook } from './courseContent';
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

/** The content's getters, for one language: Our World's lessons, sections and section checks. */
export type Content = OurWorldContent;

function createContent(
  course: CourseFile,
  lessonList: readonly Lesson[],
  quizzes: readonly QuizFile[],
  pictureUrls: ReadonlyMap<string, string>,
): Content {
  const quizzesBySection = new Map(quizzes.map((q) => [q.section, q]));
  return {
    ...createCourseContent(course, lessonList, {
      courseId: DEFAULT_COURSE_ID,
      pictureUrls,
      hasSectionChecks: true,
      // Each section's own tint and icon (docs/design-system/README.md).
      sectionLook: (sectionId) => ({ tone: sectionId as SectionId, icon: SECTION_ICONS[sectionId as SectionId] }),
      coursePath: (sectionId) => (sectionId ? `/course#${sectionId}` : '/course'),
      educatorsPath,
    }),
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
