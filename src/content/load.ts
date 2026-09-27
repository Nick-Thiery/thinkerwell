/**
 * Checking the content (content/*.json) with the zod schemas in ./schema:
 * every file on its own, then the files against each other. It runs at
 * build time (the content plugin in vite.config.ts, also in the dev server
 * and in Vitest) and in src/content/content.test.ts, never in the browser:
 * the app gets content that has already passed (./index.ts), so zod isn't
 * part of what every device downloads.
 */
// With extensions: vite.config.ts imports this file, and Vite's coming
// native config loader (Node itself) needs them.
import { assembleContent, type LoadedContent } from './assemble.ts';
import { ContentError } from './errors.ts';
import { courseFileSchema, lessonSchema, quizFileSchema, type Lesson, type QuizFile } from './schema.ts';

export type ContentFileKind = 'course' | 'lesson' | 'quiz';

/**
 * Parses one content file with its schema and returns the parsed value
 * (zod trims stray spaces from text). Throws a ContentError naming every
 * problem, with `file` (e.g. "content/lessons/L10.json") in each line.
 */
export function parseContentFile(kind: ContentFileKind, raw: unknown, file: string): unknown {
  const schema = kind === 'course' ? courseFileSchema : kind === 'lesson' ? lessonSchema : quizFileSchema;
  const result = schema.safeParse(raw);
  if (!result.success) throw new ContentError(describeIssues(file, result.error));
  return result.data;
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
  // The same order the app puts them in (./assemble.ts), which lessons[] above already follows.
  return assembleContent(course, lessons);
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
