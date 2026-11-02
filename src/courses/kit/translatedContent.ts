/**
 * A preview course in another language: its translation files
 * (content/courses/<id>/<code>/, laid over the English as Our World's are:
 * src/content/translation.ts) and its translated pictures, as the course's
 * content for that language. Only a language whose lessons are translated
 * (`content` in src/i18n/locales.ts) and that has the course's files gets
 * one; any other shows the English lessons.
 *
 * In such a language a lesson has no Watch step unless it has an approved
 * video in that language, as in Our World (CLAUDE.md, "Watch"); no preview
 * course has one yet.
 */
import { createCourseContent, type CourseOptions, type LessonContent } from '../../content/courseContent';
import type { AnyCourseFile, AnyQuizFile, CourseLesson } from '../../content/schema';
import { STAGES_WITHOUT_WATCH } from '../../content/stages';
import { applyTranslation } from '../../content/translation';

/** A glob of files, keyed by path (import.meta.glob with eager: true). */
type Files = Readonly<Record<string, unknown>>;

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** The files of one language, found by their path: …/<code>/course.json, …/<code>/lessons/X.json, …/<code>/quizzes/X.json, …/<code>/visuals/X.svg. */
function inLanguage(files: Files, code: string, folder: 'course.json' | 'lessons' | 'quizzes' | 'visuals'): Map<string, unknown> {
  const marker = folder === 'course.json' ? `/${code}/course.json` : `/${code}/${folder}/`;
  return new Map(Object.entries(files).flatMap(([path, value]) => (path.includes(marker) ? [[fileName(path), value]] : [])));
}

export interface CourseSources<L extends CourseLesson> {
  course: AnyCourseFile;
  /** The English lessons, by path. */
  lessons: Readonly<Record<string, L>>;
  /** The English section checks, by path (none for a course without them). */
  quizzes?: Readonly<Record<string, AnyQuizFile>>;
  /** Built URLs of the English pictures, keyed as `visual.src`. */
  pictureUrls: ReadonlyMap<string, string>;
  /** Every translation file of the course, by path (course.json, lessons, quizzes). */
  translations: Files;
  /** Built URLs of every translated picture, by path (…/<code>/visuals/X.svg). */
  translatedPictures: Readonly<Record<string, string>>;
}

/**
 * The course's content in each language it is translated into, by language
 * code, made with the same options as its English content.
 */
export function translatedContents<L extends CourseLesson>(
  sources: CourseSources<L>,
  codes: readonly string[],
  options: Omit<CourseOptions, 'pictureUrls' | 'quizzes' | 'stagesFor'>,
): ReadonlyMap<string, LessonContent> {
  const result = new Map<string, LessonContent>();
  for (const code of codes) {
    const course = inLanguage(sources.translations, code, 'course.json').get('course.json');
    if (!course) continue;
    const lessons = inLanguage(sources.translations, code, 'lessons');
    const quizzes = inLanguage(sources.translations, code, 'quizzes');
    const pictures = new Map(
      Object.entries(sources.translatedPictures).flatMap(([path, url]) => (path.includes(`/${code}/visuals/`) ? [[`visuals/${fileName(path)}`, url]] : [])),
    );
    result.set(
      code,
      createCourseContent(
        applyTranslation(sources.course, course),
        Object.entries(sources.lessons).map(([path, lesson]) => applyTranslation(lesson, lessons.get(fileName(path)))),
        {
          ...options,
          // A translated picture where there is one (the diagrams' words); the English otherwise (the photos).
          pictureUrls: new Map([...sources.pictureUrls, ...pictures]),
          quizzes: Object.entries(sources.quizzes ?? {}).map(([path, quiz]) => applyTranslation(quiz, quizzes.get(fileName(path)))),
          // No approved video in this language yet: no Watch step.
          stagesFor: () => STAGES_WITHOUT_WATCH,
        },
      ),
    );
  }
  return result;
}
