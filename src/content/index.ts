/**
 * The course content, loaded at build time from content/*.json and checked
 * with the zod schemas in ./schema. Everything here is synchronous.
 *
 * Course order: sections in their `number` order, then the lesson numbers
 * each section lists. "Next lesson" is worked out from that order.
 */
import courseJson from '../../content/course.json';
import { courseFileSchema, lessonSchema, type CourseFile, type Lesson, type Section, type SectionId } from './schema';

export * from './schema';
export * from './stages';

const lessonModules = import.meta.glob<unknown>('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
});

export class ContentError extends Error {
  override name = 'ContentError';
}

export interface LoadedContent {
  course: CourseFile;
  sections: Section[];
  /** In course order. */
  lessons: Lesson[];
}

function describeIssues(file: string, error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => `${file}: ${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('\n');
}

/**
 * Parses course.json and every lesson file, then checks they agree with each
 * other. Throws a ContentError listing every problem. Exported for tests.
 */
export function loadContent(rawCourse: unknown, rawLessons: Record<string, unknown>): LoadedContent {
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

const content = loadContent(courseJson, lessonModules);
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
