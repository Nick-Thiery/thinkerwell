/**
 * The course content, loaded at build time from content/*.json and checked
 * with the zod schemas in ./schema. Everything here is synchronous.
 *
 * Course order: sections in their `number` order, then the lesson numbers
 * each section lists. "Next lesson" is worked out from that order.
 */
import courseJson from '../../content/course.json';
import {
  courseFileSchema,
  lessonSchema,
  quizFileSchema,
  type CourseFile,
  type Lesson,
  type QuizFile,
  type Section,
  type SectionId,
} from './schema';

export * from './schema';
export * from './stages';

const lessonModules = import.meta.glob<unknown>('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
});

const quizModules = import.meta.glob<unknown>('../../content/quizzes/*.json', {
  eager: true,
  import: 'default',
});

/** Paths of every picture file, as they appear in a lesson's `visual.src` (e.g. "visuals/L01.svg"). */
const visualPaths = new Set(
  Object.keys(import.meta.glob('../../content/visuals/*.svg')).map((path) => path.replace(/^.*\/content\/visuals\//, 'visuals/')),
);

export class ContentError extends Error {
  override name = 'ContentError';
}

export interface LoadedContent {
  course: CourseFile;
  sections: Section[];
  /** In course order. */
  lessons: Lesson[];
}

/** A quiz file's key in `rawQuizzes`, e.g. "../../content/quizzes/history.json", tells us its section. */
function sectionFromQuizPath(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '');
}

function describeIssues(file: string, error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => `${file}: ${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('\n');
}

/**
 * Parses course.json and every lesson file, then checks they agree with each
 * other. Throws a ContentError listing every problem. Exported for tests.
 */
export function loadContent(
  rawCourse: unknown,
  rawLessons: Record<string, unknown>,
  /** Every valid `visual.src` value (e.g. "visuals/L01.svg"); when given, each lesson's picture must exist here. */
  validVisualSrcs?: ReadonlySet<string>,
): LoadedContent {
  const problems: string[] = [];

  const courseResult = courseFileSchema.safeParse(rawCourse);
  if (!courseResult.success) problems.push(describeIssues('content/course.json', courseResult.error));

  const parsed: Lesson[] = [];
  for (const [path, raw] of Object.entries(rawLessons).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.replace(/^.*content\//, 'content/');
    const result = lessonSchema.safeParse(raw);
    if (result.success) parsed.push(result.data);
    else problems.push(describeIssues(file, result.error));
  }

  if (!courseResult.success || problems.length > 0) throw new ContentError(problems.join('\n'));
  const course = courseResult.data;

  const sections = [...course.sections].sort((a, b) => a.number - b.number);
  const byNumber = new Map<number, Lesson>();
  const seenIds = new Set<string>();
  const seenOldIds = new Set<string>();

  for (const lesson of parsed) {
    if (byNumber.has(lesson.number)) problems.push(`Two lessons have number ${lesson.number}.`);
    byNumber.set(lesson.number, lesson);
    if (seenIds.has(lesson.id)) problems.push(`Two lessons have id "${lesson.id}".`);
    seenIds.add(lesson.id);
    if (seenOldIds.has(lesson.oldId)) problems.push(`Two lessons have oldId "${lesson.oldId}".`);
    seenOldIds.add(lesson.oldId);
    if (validVisualSrcs && lesson.visual && !validVisualSrcs.has(lesson.visual.src)) {
      problems.push(`Lesson ${lesson.number} (${lesson.id}) has visual.src "${lesson.visual.src}", but no such file exists in content/visuals/.`);
    }
  }
  for (const oldId of seenOldIds) {
    if (seenIds.has(oldId)) problems.push(`oldId "${oldId}" is also a lesson id, so its redirect would be ambiguous.`);
  }

  const sectionIds = new Set<string>();
  const sectionNumbers = new Set<number>();
  const listed = new Set<number>();
  const lessons: Lesson[] = [];
  for (const section of sections) {
    if (sectionIds.has(section.id)) problems.push(`Two sections have id "${section.id}".`);
    sectionIds.add(section.id);
    if (sectionNumbers.has(section.number)) problems.push(`Two sections have number ${section.number}.`);
    sectionNumbers.add(section.number);
    for (const n of section.lessons) {
      const lesson = byNumber.get(n);
      if (listed.has(n)) problems.push(`Lesson ${n} is listed in more than one section.`);
      listed.add(n);
      if (!lesson) {
        problems.push(`Section "${section.id}" lists lesson ${n}, but there is no lesson file with that number.`);
        continue;
      }
      if (lesson.section !== section.id) {
        problems.push(`Lesson ${n} says its section is "${lesson.section}", but it is listed in "${section.id}".`);
      }
      lessons.push(lesson);
    }
  }
  for (const n of byNumber.keys()) {
    if (!listed.has(n)) problems.push(`Lesson ${n} is not listed in any section of course.json.`);
  }
  if (course.course.totalLessons !== parsed.length) {
    problems.push(`course.json says totalLessons is ${course.course.totalLessons}, but there are ${parsed.length} lesson files.`);
  }

  if (problems.length > 0) throw new ContentError(problems.join('\n'));
  return { course, sections, lessons };
}

/**
 * Parses every quiz file in content/quizzes/, checks it against `lessons`
 * (every question's lesson number must exist and belong to the quiz's
 * section) and returns one QuizFile per section. Throws a ContentError
 * listing every problem. Exported for tests.
 */
export function loadQuizzes(rawQuizzes: Record<string, unknown>, lessons: readonly Lesson[]): QuizFile[] {
  const problems: string[] = [];
  const sectionOfLesson = new Map(lessons.map((l) => [l.number, l.section]));

  const parsed: QuizFile[] = [];
  const seenSections = new Set<string>();
  for (const [path, raw] of Object.entries(rawQuizzes).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.replace(/^.*content\//, 'content/');
    const result = quizFileSchema.safeParse(raw);
    if (!result.success) {
      problems.push(describeIssues(file, result.error));
      continue;
    }
    const quiz = result.data;
    const expectedSection = sectionFromQuizPath(path);
    if (quiz.section !== expectedSection) {
      problems.push(`${file}: section is "${quiz.section}", but the file is named for "${expectedSection}".`);
    }
    if (seenSections.has(quiz.section)) problems.push(`Two quiz files have section "${quiz.section}".`);
    seenSections.add(quiz.section);

    const seenIds = new Set<string>();
    for (const question of quiz.questions) {
      if (seenIds.has(question.id)) problems.push(`${file}: two questions have id "${question.id}".`);
      seenIds.add(question.id);
      const lessonSection = sectionOfLesson.get(question.lesson);
      if (lessonSection === undefined) {
        problems.push(`${file}: question "${question.id}" is about Lesson ${question.lesson}, but there is no such lesson.`);
      } else if (lessonSection !== quiz.section) {
        problems.push(
          `${file}: question "${question.id}" is about Lesson ${question.lesson}, which is in "${lessonSection}", not "${quiz.section}".`,
        );
      }
    }
    parsed.push(quiz);
  }

  if (problems.length > 0) throw new ContentError(problems.join('\n'));
  return parsed;
}

const content = loadContent(courseJson, lessonModules, visualPaths);
const quizzes = loadQuizzes(quizModules, content.lessons);
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

/** Every section check, one per section. */
export function getQuizzes(): readonly QuizFile[] {
  return quizzes;
}

/** A section's check (content/quizzes/<sectionId>.json). */
export function getQuiz(sectionId: string): QuizFile | undefined {
  return quizzesBySection.get(sectionId as SectionId);
}
