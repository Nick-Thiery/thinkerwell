/**
 * How the build keeps a preview course (src/content/courses.ts) out of
 * everyone else's download (vite.config.ts). Pure, with no imports but the
 * course list, so it runs in the build and in tests.
 *
 *   assets/preview/<id>/<name>-<hash>.js    the course's code, lessons, activities and own words:
 *                                           one chunk, the dynamic entry src/courses/<id>/index.tsx
 *   assets/preview/<id>/<name>-<hash>.css   its stylesheet (imported with ?url, added with a <link>)
 *   assets/preview/<name>-<hash>.js         the door to every preview course (src/courses/routes.tsx
 *                                           and preview.tsx): its pages' routes and the loader, and the
 *                                           kit the courses share (src/courses/kit/) with its words
 *   assets/preview/<name>-<hash>.css        the kit's stylesheet
 *
 * The service worker never precaches assets/preview/, and a first visit
 * never downloads it: only a device that has turned the preview on loads
 * it, when it opens one of the course's pages (src/courses/preview.tsx).
 *
 * The reviewers' page for local-language Watch videos (src/courses/video-review/,
 * /review/videos) is kept out the same way, as if it were a course called
 * "video-review": its code, its words, its styles and the candidates it shows
 * (the virtual module made by vite.config.ts from docs/notes/local-videos/)
 * go into assets/preview/video-review/. Learners' devices never download it.
 *
 * There is no codeSplitting group for it on purpose: a group takes in its
 * modules' dependencies too, which would pull the shared lesson player into
 * the course's chunk. As a dynamic entry that nothing else imports, the
 * course's own modules land in its chunk anyway, and the shared ones stay
 * where Our World has them. The build stops if a course's module ends up in
 * any other chunk (keepFirstVisitLight in vite.config.ts).
 */
import { PREVIEW_COURSES } from '../content/courses.ts';
import type { CourseFile, CourseFilesManifest } from '../offline/courseCache.ts';

/** The precache leaves these out (Workbox globIgnores). */
export const PREVIEW_PRECACHE_IGNORES = ['assets/preview/**'];

/** Where a preview course's built files go. */
export const PREVIEW_ASSET_DIR = 'assets/preview/';

/** The reviewers' page for local-language Watch videos: kept out of everyone's download like a preview course. */
export const VIDEO_REVIEW = 'video-review';
/** `import data from 'virtual:thinkerwell/video-review'`: the candidates the reviewers' page shows (vite.config.ts). */
export const VIDEO_REVIEW_MODULE = 'virtual:thinkerwell/video-review';
/** The resolved id of that module. */
export const VIDEO_REVIEW_ID = '\0tw-video-review';

/** `import words from 'virtual:thinkerwell/course-messages/<id>'`: a course's own interface words, by language. */
export const COURSE_MESSAGES_PREFIX = 'virtual:thinkerwell/course-messages/';
/** The resolved id of that module (rolldown's convention for a virtual module). */
export const COURSE_MESSAGES_ID = '\0tw-course-messages:';

/** The resolved id of the words every preview course shares (the `previewCourse` group, src/i18n/lazyGroups.ts). */
export const PREVIEW_KIT_MESSAGES_ID = '\0tw-messages:previewCourse';

/**
 * True for the door to the preview courses (src/courses/routes.tsx,
 * preview.tsx), the kit they share (src/courses/kit/) and its words, and
 * anything in a preview course.
 */
export function isPreviewModule(moduleId: string): boolean {
  const id = moduleId.replace(/\\/g, '/');
  return /\/src\/courses\/(?!build\.ts$|types\.ts$)/.test(id) || id === PREVIEW_KIT_MESSAGES_ID || previewCourseOfModule(moduleId) !== null;
}

/**
 * The preview course a module belongs to, or null: its code
 * (src/courses/<id>/), its content (content/courses/<id>/) or its own words
 * (the course messages module).
 */
export function previewCourseOfModule(moduleId: string): string | null {
  const id = moduleId.replace(/\\/g, '/');
  if (id.includes(`/src/courses/${VIDEO_REVIEW}/`) || id === VIDEO_REVIEW_ID) return VIDEO_REVIEW;
  for (const course of PREVIEW_COURSES) {
    if (id.includes(`/src/courses/${course.id}/`) || id.includes(`/content/${course.dir}/`) || id === `${COURSE_MESSAGES_ID}${course.id}`) {
      return course.id;
    }
  }
  return null;
}

/**
 * The file name pattern for a chunk whose entry is a preview course's or the
 * door's (output.chunkFileNames), or for a chunk with no entry made only of
 * preview modules (what two preview courses share: the kit,
 * src/courses/kit/), or null for any other.
 */
export function previewChunkFileName(chunk: { facadeModuleId?: string | null; moduleIds?: readonly string[] }): string | null {
  const facade = chunk.facadeModuleId;
  if (!facade) {
    const ids = chunk.moduleIds ?? [];
    return ids.length > 0 && ids.every(isPreviewModule) ? `${PREVIEW_ASSET_DIR}[name]-[hash].js` : null;
  }
  const course = previewCourseOfModule(facade);
  if (course) return `${PREVIEW_ASSET_DIR}${course}/[name]-[hash].js`;
  return isPreviewModule(facade) ? `${PREVIEW_ASSET_DIR}[name]-[hash].js` : null;
}

/** The file name pattern for a preview course's asset (its stylesheet, its pictures), or null for any other. */
export function previewAssetFileName(asset: { names?: readonly string[]; originalFileNames?: readonly string[] }): string | null {
  const sources = [...(asset.originalFileNames ?? []), ...(asset.names ?? [])].map((name) => `/${name.replace(/\\/g, '/').replace(/^\/+/, '')}`);
  const course = sources.map(previewCourseOfModule).find(Boolean);
  if (course) return `${PREVIEW_ASSET_DIR}${course}/[name]-[hash][extname]`;
  // The kit's stylesheet (src/courses/kit/previewCourse.css), which every preview course shares.
  return sources.some(isPreviewModule) ? `${PREVIEW_ASSET_DIR}[name]-[hash][extname]` : null;
}

/** The built list of every course's files (COURSE_MANIFEST_URL), served from the site's root. */
export const COURSE_FILES_FILE = 'course-files.json';

/**
 * The list of the files a device keeps to use each course offline, from the
 * built files under assets/preview/ (src/offline/courseCache.ts): what every
 * course shares (the door and kit, their words and stylesheet) and each
 * course's own folder. The reviewers' page is left out. A file in a folder
 * that is no course stops the build, so nothing is quietly left out of an
 * offline copy.
 */
export function courseFilesManifest(files: ReadonlyArray<{ fileName: string; bytes: number }>): CourseFilesManifest {
  const manifest: CourseFilesManifest = { shared: [], courses: Object.fromEntries(PREVIEW_COURSES.map((course) => [course.id, [] as CourseFile[]])) };
  for (const { fileName, bytes } of files) {
    if (!fileName.startsWith(PREVIEW_ASSET_DIR)) continue;
    const rest = fileName.slice(PREVIEW_ASSET_DIR.length);
    const folder = rest.includes('/') ? rest.slice(0, rest.indexOf('/')) : null;
    if (folder === VIDEO_REVIEW) continue;
    const entry = { url: `/${fileName}`, bytes };
    if (folder === null) manifest.shared.push(entry);
    else if (manifest.courses[folder]) manifest.courses[folder].push(entry);
    else throw new Error(`${fileName} is in assets/preview/${folder}/, which is no course in src/content/courses.ts.`);
  }
  const byUrl = (a: CourseFile, b: CourseFile) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  manifest.shared.sort(byUrl);
  for (const list of Object.values(manifest.courses)) list.sort(byUrl);
  return manifest;
}
