/**
 * "Courses for offline use" in Settings: saving the files of the courses
 * other than Our World (their code, lessons, words, styles and pictures,
 * assets/preview/) on the device, so their pages open with no internet.
 * Our World itself is in the precache after the first visit; these are
 * built apart so that a first visit stays light (src/courses/build.ts).
 *
 * - The build's list (/course-files.json, src/offline/courseCache.ts) gives
 *   every course's files and sizes. What every course shares (the door to the
 *   courses, the kit and its words) goes with each course.
 * - Files already on the device are skipped, so a download that was stopped,
 *   or broke off, carries on where it was. Three at a time.
 * - The service worker keeps a file as it passes (src/offline/sw.ts). Where no
 *   worker controls the page, the file is put in the same cache from here.
 * - A course a learner has simply opened is kept too, as far as they went
 *   (code, the lessons opened); saving it here is what makes all of it
 *   available, and the status says which it is.
 * - Stopping keeps what has been downloaded. Audio is separate ("Lesson
 *   audio", src/audio/download.ts).
 */
import { COURSE_CACHE, COURSE_MANIFEST_URL, type CourseFile, type CourseFilesManifest } from './courseCache';

export interface CourseDownloadProgress {
  done: number;
  total: number;
}

export type CourseDownloadResult = 'done' | 'stopped' | 'failed';

/** At most this many files download at once. */
export const COURSE_DOWNLOAD_CONCURRENCY = 3;

/** True where files can be kept on the device (the Cache API exists here). */
export function canKeepCourses(): boolean {
  return typeof caches !== 'undefined' && typeof caches.open === 'function';
}

/** What a course needs offline: what the courses share, then its own files. */
export function filesOfCourse(manifest: CourseFilesManifest, courseId: string): CourseFile[] {
  return [...manifest.shared, ...(manifest.courses[courseId] ?? [])];
}

export function totalBytes(files: readonly CourseFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

function isManifest(value: unknown): value is CourseFilesManifest {
  const manifest = value as Partial<CourseFilesManifest> | null;
  return Boolean(manifest) && Array.isArray(manifest?.shared) && typeof manifest?.courses === 'object' && manifest.courses !== null;
}

/** The build's list of course files: from the site, else the copy kept last time. Null when neither is there. */
export async function loadCourseManifest(signal?: AbortSignal): Promise<CourseFilesManifest | null> {
  try {
    const response = await fetch(COURSE_MANIFEST_URL, { signal, cache: 'no-cache' });
    if (response.ok) {
      const value: unknown = await response.json();
      if (isManifest(value)) return value;
    }
  } catch {
    // Offline or stopped: use the kept copy.
  }
  if (!canKeepCourses()) return null;
  try {
    const kept = await (await caches.open(COURSE_CACHE)).match(COURSE_MANIFEST_URL);
    const value: unknown = kept ? await kept.json() : null;
    return isManifest(value) ? value : null;
  } catch {
    return null;
  }
}

/** How many of these files, and how many of their bytes, are on the device. */
export async function storedCourseFiles(files: readonly CourseFile[]): Promise<{ count: number; bytes: number }> {
  if (!canKeepCourses()) return { count: 0, bytes: 0 };
  try {
    const cache = await caches.open(COURSE_CACHE);
    let count = 0;
    let bytes = 0;
    for (const file of files) {
      if (await cache.match(file.url)) {
        count += 1;
        bytes += file.bytes;
      }
    }
    return { count, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

/**
 * Downloads every file of these courses that isn't on the device yet.
 * 'failed' when any file couldn't be downloaded (the rest are kept);
 * 'stopped' when `signal` stopped it.
 */
export async function downloadCourses(
  files: readonly CourseFile[],
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: CourseDownloadProgress) => void } = {},
): Promise<CourseDownloadResult> {
  if (!canKeepCourses()) return 'failed';
  const unique = [...new Map(files.map((file) => [file.url, file])).values()];
  let cache: Cache;
  try {
    cache = await caches.open(COURSE_CACHE);
  } catch {
    return 'failed';
  }
  const total = totalBytes(unique);
  let done = 0;
  const queue: CourseFile[] = [];
  for (const file of unique) {
    if (await cache.match(file.url)) done += file.bytes;
    else queue.push(file);
  }
  onProgress?.({ done, total });
  let failed = false;
  const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
  const worker = async (): Promise<void> => {
    for (let file = queue.shift(); file && !signal?.aborted; file = queue.shift()) {
      try {
        const response = await fetch(file.url, { signal });
        if (!response.ok) throw new Error(`${file.url}: ${response.status}`);
        if (controlled) await response.blob();
        else await cache.put(file.url, response);
        done += file.bytes;
        onProgress?.({ done, total });
      } catch {
        if (!signal?.aborted) failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: COURSE_DOWNLOAD_CONCURRENCY }, worker));
  if (signal?.aborted) return 'stopped';
  return failed ? 'failed' : 'done';
}

/** Removes a course's own files from the device (not what the courses share). */
export async function removeCourse(manifest: CourseFilesManifest, courseId: string): Promise<void> {
  if (!canKeepCourses()) return;
  const cache = await caches.open(COURSE_CACHE);
  await Promise.all((manifest.courses[courseId] ?? []).map((file) => cache.delete(file.url)));
}
