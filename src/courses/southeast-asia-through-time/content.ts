/**
 * Southeast Asia Through Time's content
 * (content/courses/southeast-asia-through-time/), checked at build time like
 * Our World's (vite.config.ts, checkContent; zod never reaches the browser).
 * Only this course's chunk imports it, so its lessons and pictures load only
 * on a device that has turned the preview on.
 */
import courseJson from '../../../content/courses/southeast-asia-through-time/course.json';
import { COURSE_SECTION_LOOKS } from '../kit/courseLooks';
import { createCourseContent, type LessonContent, type SectionLook } from '../../content/courseContent';
import type { AnyQuizFile, SoutheastAsiaCourseFile, SoutheastAsiaLesson, SoutheastAsiaSectionId } from '../../content/schema';
import { translatedContents } from '../kit/translatedContent';

export const COURSE_ID = 'southeast-asia-through-time';
/** The course map. */
export const COURSE_PATH = `/course/${COURSE_ID}`;
/** Every lesson on paper. */
export const COURSE_PRINT_PATH = `${COURSE_PATH}/print`;

const lessonModules = import.meta.glob<SoutheastAsiaLesson>('../../../content/courses/southeast-asia-through-time/lessons/*.json', {
  eager: true,
  import: 'default',
});

/** Its four section checks (content/courses/southeast-asia-through-time/quizzes/), from Justin's brief, section 4. */
const quizModules = import.meta.glob<AnyQuizFile>('../../../content/courses/southeast-asia-through-time/quizzes/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Each lesson's two pictures: an original diagram (SVG) and a real photo or
 * map from Wikimedia Commons (JPEG), both served from this site. A picture
 * whose file isn't there yet is simply not shown (its description is in the
 * teacher guide's notes for reviewers).
 */
const pictureUrls = new Map(
  Object.entries(
    import.meta.glob<string>('../../../content/courses/southeast-asia-through-time/visuals/*.{svg,jpg}', {
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
export const SECTION_LOOKS: Readonly<Record<SoutheastAsiaSectionId, SectionLook>> = COURSE_SECTION_LOOKS['southeast-asia-through-time'];

const coursePath = (sectionId?: string) => (sectionId ? `${COURSE_PATH}#${sectionId}` : COURSE_PATH);

const options = {
  courseId: COURSE_ID,
  // Its section checks (no certificates yet).
  hasSectionChecks: true,
  sectionLook: (sectionId: string) => SECTION_LOOKS[sectionId as SoutheastAsiaSectionId] ?? SECTION_LOOKS['evidence-and-connections'],
  // No Educators page for a preview course: a teacher guide goes back to the course map.
  coursePath,
};

export const southeastAsia = createCourseContent(courseJson as unknown as SoutheastAsiaCourseFile, Object.values(lessonModules), {
  ...options,
  pictureUrls,
  quizzes: Object.values(quizModules),
});

/**
 * The course in Indonesian and Malay (content/courses/southeast-asia-through-time/<code>/:
 * every lesson, check and diagram, drafted by AI and flagged for native-speaker
 * review, as Our World's are).
 */
const byLanguage = translatedContents(
  {
    course: courseJson as unknown as SoutheastAsiaCourseFile,
    lessons: lessonModules,
    quizzes: quizModules,
    pictureUrls,
    translations: import.meta.glob('../../../content/courses/southeast-asia-through-time/*/{course.json,lessons/*.json,quizzes/*.json}', {
      eager: true,
      import: 'default',
    }),
    translatedPictures: import.meta.glob<string>('../../../content/courses/southeast-asia-through-time/*/visuals/*.svg', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  },
  ['id', 'ms', 'vi'],
  options,
);

/** The course in a language its lessons are translated into, or undefined (English). */
export const southeastAsiaIn = (code: string): LessonContent | undefined => byLanguage.get(code);
