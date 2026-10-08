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
import { activityProblems } from './activityChecks.ts';
import { assembleContent, type LoadedContent } from './assemble.ts';
import { COURSES, DEFAULT_COURSE_ID, type CourseDefinition } from './courses.ts';
import { ContentError } from './errors.ts';
import {
  COURSE_SCHEMAS,
  quizFileSchema,
  type AnyCourseFile,
  type CourseLesson,
  type CourseSchemaId,
  type Lesson,
  type QuizFile,
} from './schema.ts';
import { applyTranslation, missingTranslations, translationProblems } from './translation.ts';

export type ContentFileKind = 'course' | 'lesson' | 'quiz';

/** A course's schemas (./schema.ts COURSE_SCHEMAS), or a ContentError for a course with none. */
function schemasFor(courseId: string, file: string) {
  const schemas = COURSE_SCHEMAS[courseId as CourseSchemaId] as (typeof COURSE_SCHEMAS)[CourseSchemaId] | undefined;
  if (!schemas) throw new ContentError(`${file}: there are no schemas for the course "${courseId}" (src/content/schema.ts, COURSE_SCHEMAS).`);
  return schemas;
}

/**
 * Parses one content file with its schema and returns the parsed value
 * (zod trims stray spaces from text). Throws a ContentError naming every
 * problem, with `file` (e.g. "content/lessons/L10.json") in each line.
 * `courseId` picks another course's schemas (src/content/courses.ts):
 * Digital World's lessons have their own sections and activities.
 */
export function parseContentFile(kind: ContentFileKind, raw: unknown, file: string, courseId: string = DEFAULT_COURSE_ID): unknown {
  const schemas = schemasFor(courseId, file);
  const schema = kind === 'course' ? schemas.course : kind === 'lesson' ? schemas.lesson : quizFileSchema;
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
  return loadCourseFiles(COURSES[0]!, rawCourse, rawLessons, validVisualSrcs ? { pictures: validVisualSrcs, picturesRequired: true } : {}) as unknown as LoadedContent;
}

export interface CourseLoadOptions {
  /** Every picture the course has (e.g. "visuals/L01.svg"), to check each lesson's `visual.src` against. */
  pictures?: ReadonlySet<string>;
  /**
   * True: a lesson whose picture isn't there is a problem (Our World).
   * False: it is planned and not drawn yet (a draft course says so in
   * `visual.description`); the lesson shows no picture until it is.
   */
  picturesRequired?: boolean;
}

/**
 * Parses another course's files (content/courses/<id>/: course.json and
 * lessons/*.json) with that course's schemas, and checks them against each
 * other as loadContent() does Our World's, plus: every lesson id starts with
 * the course's prefix (src/content/courses.ts), and each lesson's activity
 * passes ./activityChecks.ts. Throws a ContentError listing every problem.
 */
export function loadCourse(
  courseId: string,
  rawCourse: unknown,
  rawLessons: Record<string, unknown>,
  options: CourseLoadOptions = {},
): LoadedContent<CourseLesson, AnyCourseFile> {
  const definition = COURSES.find((course) => course.id === courseId);
  if (!definition) throw new ContentError(`There is no course "${courseId}" in src/content/courses.ts.`);
  return loadCourseFiles(definition, rawCourse, rawLessons, options);
}

function loadCourseFiles(
  definition: CourseDefinition,
  rawCourse: unknown,
  rawLessons: Record<string, unknown>,
  options: CourseLoadOptions,
): LoadedContent<CourseLesson, AnyCourseFile> {
  const problems: string[] = [];
  const base = definition.dir ? `content/${definition.dir}/` : 'content/';
  const schemas = schemasFor(definition.id, `${base}course.json`);

  const courseResult = schemas.course.safeParse(rawCourse);
  if (!courseResult.success) problems.push(describeIssues(`${base}course.json`, courseResult.error));

  const parsed: CourseLesson[] = [];
  for (const [path, raw] of Object.entries(rawLessons).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.replace(/^.*content\//, 'content/');
    const result = schemas.lesson.safeParse(raw);
    if (result.success) {
      const lesson = result.data as CourseLesson;
      parsed.push(lesson);
      if (lesson.activity) problems.push(...activityProblems(lesson.activity, `${file}: activity`));
    } else problems.push(describeIssues(file, result.error));
  }

  if (!courseResult.success || problems.length > 0) throw new ContentError(problems.join('\n'));
  const course = courseResult.data as AnyCourseFile;

  const sections = [...course.sections].sort((a, b) => a.number - b.number);
  const byNumber = new Map<number, CourseLesson>();
  const seenIds = new Set<string>();
  const seenOldIds = new Set<string>();
  // Every other course's lesson prefix: no lesson here may start with one (its address would go to that course).
  const otherPrefixes = COURSES.filter((other) => other !== definition && other.lessonIdPrefix).map((other) => other.lessonIdPrefix);

  for (const lesson of parsed) {
    if (byNumber.has(lesson.number)) problems.push(`Two lessons have number ${lesson.number}.`);
    byNumber.set(lesson.number, lesson);
    if (seenIds.has(lesson.id)) problems.push(`Two lessons have id "${lesson.id}".`);
    seenIds.add(lesson.id);
    if (definition.lessonIdPrefix && !lesson.id.startsWith(definition.lessonIdPrefix)) {
      problems.push(`Lesson ${lesson.number} (${lesson.id}) needs an id starting "${definition.lessonIdPrefix}", like every lesson in ${base}.`);
    }
    const clash = otherPrefixes.find((prefix) => lesson.id.startsWith(prefix));
    if (clash) problems.push(`Lesson ${lesson.number} (${lesson.id}) starts with "${clash}", another course's lesson prefix (src/content/courses.ts).`);
    if (lesson.oldId !== null) {
      if (seenOldIds.has(lesson.oldId)) problems.push(`Two lessons have oldId "${lesson.oldId}".`);
      seenOldIds.add(lesson.oldId);
    }
    if (options.pictures && options.picturesRequired && lesson.visual && !options.pictures.has(lesson.visual.src)) {
      problems.push(`Lesson ${lesson.number} (${lesson.id}) has visual.src "${lesson.visual.src}", but no such file exists in ${base}visuals/.`);
    }
  }
  for (const oldId of seenOldIds) {
    if (seenIds.has(oldId)) problems.push(`oldId "${oldId}" is also a lesson id, so its redirect would be ambiguous.`);
  }

  const sectionIds = new Set<string>();
  const sectionNumbers = new Set<number>();
  const listed = new Set<number>();
  const lessons: CourseLesson[] = [];
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
    if (!listed.has(n)) problems.push(`Lesson ${n} is not listed in any section of ${base}course.json.`);
  }
  if (course.course.totalLessons !== parsed.length) {
    problems.push(`${base}course.json says totalLessons is ${course.course.totalLessons}, but there are ${parsed.length} lesson files.`);
  }

  if (problems.length > 0) throw new ContentError(problems.join('\n'));
  // The same order the app puts them in (./assemble.ts), which lessons[] above already follows.
  return assembleContent<CourseLesson, AnyCourseFile>(course, lessons);
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

/** A language's translation files (content/<code>/), as read from disk. */
export interface TranslationFiles {
  course: unknown;
  /** By path, e.g. "content/id/lessons/L01.json". */
  lessons: Record<string, unknown>;
  /** By path, e.g. "content/id/quizzes/history.json". */
  quizzes: Record<string, unknown>;
  /** Picture files, e.g. "visuals/L01.svg". */
  visuals: ReadonlySet<string>;
}

/** The English files, by path, as checkTranslation compares them. */
export interface EnglishFiles {
  course: unknown;
  lessons: Record<string, unknown>;
  quizzes: Record<string, unknown>;
}

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/**
 * Checks one language's translation (content/<code>/) against the English:
 * every file has the English file's shape and translates every string a
 * learner reads, and nothing else (./translation.ts); laid over the English,
 * everything still passes the schemas and the cross-file checks; and every
 * English lesson picture has its translated copy. Throws a ContentError
 * listing every problem. Runs at build time (vite.config.ts) and in tests.
 */
export function checkTranslation(code: string, english: EnglishFiles, translation: TranslationFiles): void {
  const problems: string[] = [];
  const where = (kind: string, name: string) => `content/${code}/${kind}${name}`;
  const compare = (label: string, en: unknown, tr: unknown) => {
    for (const problem of translationProblems(en, tr)) problems.push(`${label}: ${problem}`);
    for (const path of missingTranslations(en, tr)) problems.push(`${label}: ${path}: not translated`);
  };

  compare(where('', 'course.json'), english.course, translation.course);
  const byName = (files: Record<string, unknown>) => new Map(Object.entries(files).map(([path, raw]) => [baseName(path), raw]));
  const lessons = byName(translation.lessons);
  const quizzes = byName(translation.quizzes);
  const mergedLessons: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(english.lessons)) {
    const name = baseName(path);
    if (!lessons.has(name)) problems.push(`${where('lessons/', name)} is missing.`);
    else compare(where('lessons/', name), raw, lessons.get(name));
    mergedLessons[path] = applyTranslation(raw, lessons.get(name));
    const src = (raw as { visual?: { src?: string } | null }).visual?.src;
    if (src && !translation.visuals.has(src)) problems.push(`content/${code}/${src} is missing (a copy of content/${src} with its words translated).`);
  }
  const mergedQuizzes: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(english.quizzes)) {
    const name = baseName(path);
    if (!quizzes.has(name)) problems.push(`${where('quizzes/', name)} is missing.`);
    else compare(where('quizzes/', name), raw, quizzes.get(name));
    mergedQuizzes[path] = applyTranslation(raw, quizzes.get(name));
  }
  for (const name of lessons.keys()) {
    if (!Object.keys(english.lessons).some((path) => baseName(path) === name)) problems.push(`${where('lessons/', name)} has no English lesson.`);
  }
  if (problems.length > 0) throw new ContentError(problems.join('\n'));

  try {
    const { lessons: loaded } = loadContent(applyTranslation(english.course, translation.course), mergedLessons);
    loadQuizzes(mergedQuizzes, loaded);
  } catch (error) {
    throw new ContentError(`The ${code} translation, laid over the English:\n${error instanceof Error ? error.message : String(error)}`);
  }
}
