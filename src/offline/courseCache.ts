/**
 * Where the service worker keeps a course's files once a device has used or
 * saved the course (src/offline/sw.ts, src/offline/courseFiles.ts): a cache
 * of its own, apart from the precache, which a new version of the site never
 * empties. Every course other than Our World is built into assets/preview/
 * (src/courses/build.ts) and is far too big to precache for every visitor
 * (the first visit stays light), so a course's files are kept as the page
 * fetches them, or all at once when a teacher saves the course in Settings.
 * Files are named by their hash, so a kept file never goes stale; the worker
 * deletes those the current version doesn't list. Pure, no imports, so the
 * worker, the page and the build share it.
 */
export const COURSE_CACHE = 'thinkerwell-courses-v1';

/** Every course file (code, lessons, words, styles, pictures) is under this path. */
export const COURSE_PREFIX = '/assets/preview/';

/** The reviewers' page for local-language Watch videos shares the folder but is not a course: never kept. */
export const NOT_A_COURSE_PREFIX = '/assets/preview/video-review/';

/** The list of every course's files, written at build time (src/courses/build.ts, courseFilesManifest) and never precached. */
export const COURSE_MANIFEST_URL = '/course-files.json';

export interface CourseFile {
  /** Where it is served from: "/assets/preview/digital-world/DW-xxxx.js". */
  url: string;
  bytes: number;
}

export interface CourseFilesManifest {
  /** What every course needs: the door to the courses, the pages they share with their words, and their shared stylesheet. */
  shared: CourseFile[];
  /** Each course's own files, by course id. */
  courses: Record<string, CourseFile[]>;
}

/** True for a path the worker keeps for a course (and not the reviewers' page). */
export function isCourseFile(pathname: string): boolean {
  return pathname.startsWith(COURSE_PREFIX) && !pathname.startsWith(NOT_A_COURSE_PREFIX);
}
