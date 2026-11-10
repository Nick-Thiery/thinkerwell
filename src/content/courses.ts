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
 * A course other than Our World is built as a "preview" course: its
 * lessons, its activities, its code and its own interface words are in
 * chunks that load only when someone opens the course, from files outside
 * the precache that a first visit never downloads (vite.config.ts,
 * docs/notes/digital-world-preview.md). A device keeps them for offline use
 * once they have been opened or saved (src/offline/courseFiles.ts).
 *
 * Whether a device shows a course is separate. A course marked `open` is
 * shown on every device (the whole-platform pilot, 9 November 2026); one
 * that is not stays invisible unless a device turns it on by visiting
 * /preview/<id> (a device setting, `previewCourses`).
 */

export interface CourseDefinition {
  /** Stable id: 'our-world', 'digital-world'. A preview course's map is /course/<id>. */
  readonly id: string;
  /** Its folder under content/ ('' for Our World, whose files sit in content/ itself). */
  readonly dir: string;
  /**
   * Built apart from the app and loaded when opened (the course's code,
   * lessons and words are in assets/preview/). True for every course but Our World.
   */
  readonly preview: boolean;
  /**
   * Shown on every device, in the course choice, with no hidden address to
   * visit first. A course without it is shown only on devices that turned it
   * on at /preview/<id>.
   */
  readonly open?: boolean;
  /** The icon beside its name in the course choice (a Lucide name). */
  readonly icon?: string;
  /** Every lesson id starts with this ('dw-'); '' for Our World. */
  readonly lessonIdPrefix: string;
  /**
   * Its own interface words: a top-level group of src/i18n/messages/*.json
   * that the build leaves out of the app's messages and gives to the
   * course's own code instead (vite.config.ts), so a learner without the
   * preview never downloads them. Our World's words are the app's.
   */
  readonly messages?: string;
  /**
   * A preview course's section ids (the same as its schema's, which a test
   * checks), so /section/:id/check finds the course without loading it.
   */
  readonly sectionIds?: readonly string[];
}

export const DEFAULT_COURSE_ID = 'our-world';

export const COURSES: readonly CourseDefinition[] = [
  { id: DEFAULT_COURSE_ID, dir: '', preview: false, lessonIdPrefix: '' },
  {
    id: 'digital-world',
    dir: 'courses/digital-world',
    preview: true,
    open: true,
    icon: 'Lightbulb',
    lessonIdPrefix: 'dw-',
    messages: 'digitalWorld',
    sectionIds: ['thinking-machines', 'who-builds-ai', 'ai-in-daily-life', 'truth-and-power'],
  },
  {
    id: 'southeast-asia-through-time',
    dir: 'courses/southeast-asia-through-time',
    preview: true,
    open: true,
    icon: 'Map',
    lessonIdPrefix: 'sat-',
    messages: 'southeastAsia',
    sectionIds: ['evidence-and-connections', 'trade-and-power', 'war-and-independence', 'memory-and-shared-histories'],
  },
  {
    id: 'art-architecture-society',
    dir: 'courses/art-architecture-society',
    preview: true,
    open: true,
    icon: 'Palette',
    lessonIdPrefix: 'aas-',
    messages: 'artArchitecture',
    sectionIds: ['objects-making-power', 'buildings-belief-places', 'stories-lives-memory', 'museums-heritage-connections'],
  },
];

/** The courses every device shows (`open`), Our World first, then the others in order. */
export const OPEN_COURSE_IDS: readonly string[] = COURSES.filter((course) => course.open).map((course) => course.id);

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

/** The preview course a section id belongs to, or undefined for Our World's (and unknown ids). */
export function previewCourseOfSection(sectionId: string | undefined): CourseDefinition | undefined {
  if (!sectionId) return undefined;
  const id = sectionId.toLowerCase();
  return PREVIEW_COURSES.find((course) => course.sectionIds?.includes(id));
}
