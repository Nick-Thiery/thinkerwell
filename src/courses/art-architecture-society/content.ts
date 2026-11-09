/**
 * Art, Architecture and Society's content
 * (content/courses/art-architecture-society/), checked at build time like
 * Our World's (vite.config.ts, checkContent; zod never reaches the browser).
 * Only this course's chunk imports it, so its lessons and pictures load only
 * on a device that has turned the preview on.
 */
import courseJson from '../../../content/courses/art-architecture-society/course.json';
import { createCourseContent, type LessonContent, type SectionLook } from '../../content/courseContent';
import type { ArtCourseFile, ArtLesson, ArtSectionId } from '../../content/schema';
import { translatedContents } from '../kit/translatedContent';

export const COURSE_ID = 'art-architecture-society';
/** The course map. */
export const COURSE_PATH = `/course/${COURSE_ID}`;
/** Every lesson on paper. */
export const COURSE_PRINT_PATH = `${COURSE_PATH}/print`;

const lessonModules = import.meta.glob<ArtLesson>('../../../content/courses/art-architecture-society/lessons/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Each lesson's two real images (JPEGs from museums and Wikimedia Commons,
 * resized and served from this site: never fetched from another server).
 */
const pictureUrls = new Map(
  Object.entries(
    import.meta.glob<string>('../../../content/courses/art-architecture-society/visuals/*.jpg', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.replace(/^.*\/visuals\//, 'visuals/'), url]),
);

/**
 * Each section's tint and icon. The brand book has colours for Our World's
 * four sections only, so the preview's sections use the same four tints in
 * order, each beside its own icon and name, as the brand book asks.
 */
export const SECTION_LOOKS: Readonly<Record<ArtSectionId, SectionLook>> = {
  'objects-making-power': { tone: 'history', icon: 'Palette' },
  'buildings-belief-places': { tone: 'geography', icon: 'Landmark' },
  'stories-lives-memory': { tone: 'culture', icon: 'BookOpen' },
  'museums-heritage-connections': { tone: 'civics', icon: 'Globe' },
};

const coursePath = (sectionId?: string) => (sectionId ? `${COURSE_PATH}#${sectionId}` : COURSE_PATH);

const options = {
  courseId: COURSE_ID,
  // No section checks: Justin's brief asks for no extra quiz.
  hasSectionChecks: false,
  sectionLook: (sectionId: string) => SECTION_LOOKS[sectionId as ArtSectionId] ?? SECTION_LOOKS['objects-making-power'],
  // No Educators page for a preview course: a teacher guide goes back to the course map.
  coursePath,
};

export const artArchitecture = createCourseContent(courseJson as unknown as ArtCourseFile, Object.values(lessonModules), {
  ...options,
  pictureUrls,
});

/** The course in Indonesian and Malay (content/courses/art-architecture-society/<code>/), when translated. */
const byLanguage = translatedContents(
  {
    course: courseJson as unknown as ArtCourseFile,
    lessons: lessonModules,
    pictureUrls,
    translations: import.meta.glob('../../../content/courses/art-architecture-society/*/{course.json,lessons/*.json}', {
      eager: true,
      import: 'default',
    }),
    // Its images are photographs of real works, the same in every language.
    translatedPictures: {},
  },
  ['id', 'ms'],
  options,
);

/** The course in a language its lessons are translated into, or undefined (English). */
export const artArchitectureIn = (code: string): LessonContent | undefined => byLanguage.get(code);
