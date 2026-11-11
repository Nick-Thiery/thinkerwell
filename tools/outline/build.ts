/**
 * Makes the outline and the credits records of every course other than Our
 * World (src/content/outlineTypes.ts) from the course's own files, as vite.config.ts
 * serves them as virtual modules. Nothing here is written by hand: a lesson
 * added, renamed or credited shows up here the next time the content is built.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { COURSE_SECTION_LOOKS } from '../../src/courses/kit/courseLooks.ts';
import { COURSES, DEFAULT_COURSE_ID } from '../../src/content/courses.ts';
import { LOCALES } from '../../src/i18n/locales.ts';
import type {
  CourseCredits,
  CourseOutlines,
  CreditLesson,
  CreditPictureRecord,
  CreditedPicture,
  CreditSource,
  OutlineLesson,
  OutlineSection,
  Titles,
} from '../../src/content/outlineTypes.ts';

/**
 * The languages whose course files are laid over the English ones (content/courses/<id>/<code>/)
 * and that learners can choose. A hidden preview language (Vietnamese, until a native speaker has
 * reviewed it) is left out: these records are precached, and a hidden language adds nothing to the
 * precache (src/i18n/build.ts). Its lessons still load from the course's own code; only the titles
 * on the learner home, the guides and Credits stay English until it is ready.
 */
export const TRANSLATED: readonly string[] = LOCALES.filter((locale) => locale.content && locale.ready).map((locale) => locale.code);

interface RawSection {
  id: string;
  number: number;
  title: string;
  lessons: number[];
}
interface RawCourse {
  course: { title: string };
  sections: RawSection[];
}
interface RawPicture {
  src?: string;
  credit?: CreditedPicture | null;
}
interface RawLesson {
  id: string;
  number: number;
  section: string;
  title: string;
  estimatedMinutes: [number, number];
  sources: CreditSource[];
  watch: { youtubeId: string; title: string; channel: string } | null;
  visual?: RawPicture;
  secondVisual?: RawPicture | null;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function otherCourses() {
  return COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID);
}

/** Each lesson's file, in the order of its number. */
function lessonFiles(dir: string): string[] {
  return readdirSync(path.join(dir, 'lessons'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => name);
}

/** Every file the outline and credits are made from, so the dev server can watch them. */
export function outlineSourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const course of otherCourses()) {
    const dir = path.join(root, 'content', course.dir);
    files.push(path.join(dir, 'course.json'));
    for (const name of lessonFiles(dir)) files.push(path.join(dir, 'lessons', name));
    for (const code of TRANSLATED) {
      if (!existsSync(path.join(dir, code, 'course.json'))) continue;
      files.push(path.join(dir, code, 'course.json'));
      for (const name of lessonFiles(dir)) {
        const translated = path.join(dir, code, 'lessons', name);
        if (existsSync(translated)) files.push(translated);
      }
    }
    const quizzes = path.join(dir, 'quizzes');
    if (existsSync(quizzes)) {
      for (const name of readdirSync(quizzes).filter((file) => file.endsWith('.json'))) files.push(path.join(quizzes, name));
    }
  }
  return files;
}

/** Sections and lessons of each other course, with their titles in every language they have. */
export function buildOutlines(root: string): CourseOutlines {
  const result: Record<string, { sections: OutlineSection[]; lessons: OutlineLesson[] }> = {};
  for (const course of otherCourses()) {
    const dir = path.join(root, 'content', course.dir);
    const english = readJson<RawCourse>(path.join(dir, 'course.json'));
    const sectionTitles = new Map<string, Record<string, string>>(english.sections.map((s) => [s.id, { en: s.title }]));
    for (const code of TRANSLATED) {
      const file = path.join(dir, code, 'course.json');
      if (!existsSync(file)) continue;
      // A translated course.json lists the sections in the English order, without their ids.
      (readJson<RawCourse>(file).sections ?? []).forEach((section, index) => {
        const titles = sectionTitles.get(english.sections[index]?.id ?? '');
        if (titles && section.title) titles[code] = section.title;
      });
    }
    const checkQuestions = (sectionId: string): number | null => {
      const file = path.join(dir, 'quizzes', `${sectionId}.json`);
      return existsSync(file) ? readJson<{ questions: unknown[] }>(file).questions.length : null;
    };
    const lessons: OutlineLesson[] = [];
    for (const name of lessonFiles(dir)) {
      const lesson = readJson<RawLesson>(path.join(dir, 'lessons', name));
      const titles: Record<string, string> = { en: lesson.title };
      for (const code of TRANSLATED) {
        const file = path.join(dir, code, 'lessons', name);
        if (existsSync(file)) {
          const translated = readJson<{ title?: string }>(file).title;
          if (translated) titles[code] = translated;
        }
      }
      lessons.push({
        id: lesson.id,
        number: lesson.number,
        section: lesson.section,
        titles,
        estimatedMinutes: lesson.estimatedMinutes,
        video: lesson.watch !== null,
      });
    }
    lessons.sort((a, b) => a.number - b.number);
    const sections: OutlineSection[] = [...english.sections]
      .sort((a, b) => a.number - b.number)
      .map((section) => ({
        id: section.id,
        number: section.number,
        titles: sectionTitles.get(section.id) as Titles,
        look: (COURSE_SECTION_LOOKS as Record<string, Record<string, OutlineSection['look']>>)[course.id]![section.id]!,
        lessons: section.lessons,
        checkQuestions: checkQuestions(section.id),
      }));
    result[course.id] = { sections, lessons };
  }
  return result;
}

/** Each lesson's sources, video and the credit of each picture that exists, by course. */
export function buildCredits(root: string): CourseCredits {
  const result: Record<string, CreditLesson[]> = {};
  for (const course of otherCourses()) {
    const dir = path.join(root, 'content', course.dir);
    const lessons: CreditLesson[] = [];
    for (const name of lessonFiles(dir)) {
      const lesson = readJson<RawLesson>(path.join(dir, 'lessons', name));
      const titles: Record<string, string> = { en: lesson.title };
      const sources: Record<string, CreditSource[]> = { en: lesson.sources.map(({ label, url }) => ({ label, url })) };
      for (const code of TRANSLATED) {
        const file = path.join(dir, code, 'lessons', name);
        if (!existsSync(file)) continue;
        const translated = readJson<{ title?: string; sources?: Array<{ label: string }> }>(file);
        if (translated.title) titles[code] = translated.title;
        // A translated lesson lists the same sources, in the same order, with its own labels.
        if (translated.sources && translated.sources.length === lesson.sources.length) {
          sources[code] = lesson.sources.map((source, index) => ({ label: translated.sources![index]!.label, url: source.url }));
        }
      }
      const pictures: CreditPictureRecord[] = [];
      for (const slot of ['visual', 'secondVisual'] as const) {
        const picture = lesson[slot];
        // Only a picture whose file exists (a lesson whose picture isn't made yet has none to credit).
        if (!picture?.src || !existsSync(path.join(dir, picture.src))) continue;
        pictures.push({ slot, credit: picture.credit ?? null });
      }
      lessons.push({
        id: lesson.id,
        number: lesson.number,
        section: lesson.section,
        titles,
        sources,
        video: lesson.watch ? { youtubeId: lesson.watch.youtubeId, title: lesson.watch.title, channel: lesson.watch.channel } : null,
        pictures,
      });
    }
    lessons.sort((a, b) => a.number - b.number);
    result[course.id] = lessons;
  }
  return result;
}
