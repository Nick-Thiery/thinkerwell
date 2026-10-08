/**
 * The courses Thinkerwell holds. Pure, with no imports, so the build
 * (vite.config.ts), the tools and the app all read the same list.
 *
 * Exploring Our World is the default course: its files are where they have
 * always been (content/course.json, content/lessons/, content/quizzes/,
 * content/visuals/), its pages are /course, /lesson/:id/:stage and the
 * rest, and it is the only course a learner sees unless a device has turned
 * a preview on.
 *
 * Every other course lives in content/courses/<id>/ (course.json and
 * lessons/), has its own section ids (src/content/schema.ts), and lesson ids
 * that start with its own prefix, so they never clash with Our World's and
 * its lessons share Our World's addresses (/lesson/dw-what-ai-is/read).
 *
 * A preview course (Digital World, a draft) is invisible unless a device
 * has turned its preview on by visiting /preview/<id> (a device setting,
 * `previewCourses`). Its lessons, its activities, its code and its own
 * interface words load only then, from files the service worker never
 * stores and a first visit never downloads (vite.config.ts,
 * docs/notes/digital-world-preview.md).
 */

export interface CourseDefinition {
  /** Stable id: 'our-world', 'digital-world'. A preview course's map is /course/<id>. */
  readonly id: string;
  /** Its folder under content/ ('' for Our World, whose files sit in content/ itself). */
  readonly dir: string;
  /** Shown only on devices that turned its preview on (/preview/<id>). */
  readonly preview: boolean;
  /** Every lesson id starts with this ('dw-'); '' for Our World. */
  readonly lessonIdPrefix: string;
  /**
   * Its own interface words: a top-level group of src/i18n/messages/*.json
   * that the build leaves out of the app's messages and gives to the
   * course's own code instead (vite.config.ts), so a learner without the
   * preview never downloads them. Our World's words are the app's.
   */
  readonly messages?: string;
}

export const DEFAULT_COURSE_ID = 'our-world';

export const COURSES: readonly CourseDefinition[] = [
  { id: DEFAULT_COURSE_ID, dir: '', preview: false, lessonIdPrefix: '' },
  { id: 'digital-world', dir: 'courses/digital-world', preview: true, lessonIdPrefix: 'dw-', messages: 'digitalWorld' },
];

/** The preview courses, in order. */
export const PREVIEW_COURSES: readonly CourseDefinition[] = COURSES.filter((course) => course.preview);

/** A preview course by its id, or undefined (Our World and unknown ids). */
export function findPreviewCourse(id: string | undefined): CourseDefinition | undefined {
  return id === undefined ? undefined : PREVIEW_COURSES.find((course) => course.id === id.toLowerCase());
}

/** The preview course a lesson id belongs to (by its prefix, in any case), or undefined for Our World's. */
export function previewCourseOfLesson(lessonId: string | undefined): CourseDefinition | undefined {
  if (!lessonId) return undefined;
  const id = lessonId.toLowerCase();
  return PREVIEW_COURSES.find((course) => id.startsWith(course.lessonIdPrefix));
}
