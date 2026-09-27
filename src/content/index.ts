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
 */
import courseJson from '../../content/course.json';
import { assembleContent } from './assemble';
import { ContentError } from './errors';
import type { CourseFile, Lesson, QuizFile, Section, SectionId } from './schema';

// Types only: a value from ./schema would bring zod into the browser bundle
// (see ./quizSkills.ts and keepZodOutOfTheBrowser in vite.config.ts).
export type * from './schema';
export { QUIZ_SKILLS } from './quizSkills';
export * from './stages';
export { ContentError } from './errors';
export type { LoadedContent } from './assemble';

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

const content = assembleContent(courseJson as unknown as CourseFile, Object.values(lessonModules));
const quizzes: QuizFile[] = Object.values(quizModules);
const quizzesBySection = new Map(quizzes.map((q) => [q.section, q]));
const lessonsById = new Map(content.lessons.map((l) => [l.id, l]));
const lessonsByOldId = new Map(content.lessons.map((l) => [l.oldId, l]));
const lessonsByNumber = new Map(content.lessons.map((l) => [l.number, l]));
const sectionsById = new Map(content.sections.map((s) => [s.id, s]));
const indexById = new Map(content.lessons.map((l, i) => [l.id, i]));

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
export function getLessons(): readonly Lesson[] {
  return content.lessons;
}

/** A section's lessons in order. */
export function getSectionLessons(sectionId: string): Lesson[] {
  const section = getSection(sectionId);
  if (!section) return [];
  return section.lessons.flatMap((n) => lessonsByNumber.get(n) ?? []);
}

export function getLesson(id: string): Lesson | undefined {
  return lessonsById.get(id);
}

/** Looks up a lesson by its Base44 id (l6, history-scale, ...). */
export function getLessonByOldId(oldId: string): Lesson | undefined {
  return lessonsByOldId.get(oldId);
}

export function getLessonByNumber(number: number): Lesson | undefined {
  return lessonsByNumber.get(number);
}

/** The section a lesson belongs to. */
export function getLessonSection(lesson: Lesson): Section {
  const section = sectionsById.get(lesson.section);
  if (!section) throw new ContentError(`Lesson ${lesson.number} has unknown section "${lesson.section}".`);
  return section;
}

/** The lesson after this one in course order, or undefined after the last lesson (or for an unknown id). */
export function getNextLesson(id: string): Lesson | undefined {
  const index = indexById.get(id);
  return index === undefined ? undefined : content.lessons[index + 1];
}

/** The lesson before this one in course order, or undefined before the first lesson (or for an unknown id). */
export function getPreviousLesson(id: string): Lesson | undefined {
  const index = indexById.get(id);
  return index === undefined || index === 0 ? undefined : content.lessons[index - 1];
}

/** The last lesson of a section, whose completion leads to the section check. */
export function isLastLessonInSection(lesson: Lesson): boolean {
  const section = getLessonSection(lesson);
  return section.lessons[section.lessons.length - 1] === lesson.number;
}

/** The built URL of a lesson picture (`visual.src`), or undefined if the file doesn't exist. */
export function getVisualUrl(src: string): string | undefined {
  return visualUrls.get(src);
}

/** Every section check, one per section. */
export function getQuizzes(): readonly QuizFile[] {
  return quizzes;
}

/** A section's check (content/quizzes/<sectionId>.json). */
export function getQuiz(sectionId: string): QuizFile | undefined {
  return quizzesBySection.get(sectionId as SectionId);
}
