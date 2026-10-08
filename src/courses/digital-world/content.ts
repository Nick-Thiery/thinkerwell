/**
 * Digital World's content (content/courses/digital-world/), checked at
 * build time like Our World's (vite.config.ts, checkContent; zod never
 * reaches the browser). Only this course's chunk imports it, so its
 * lessons load only on a device that has turned the preview on.
 */
import courseJson from '../../../content/courses/digital-world/course.json';
import { createCourseContent, type SectionLook } from '../../content/courseContent';
import type { DigitalWorldCourseFile, DigitalWorldLesson, DigitalWorldSectionId } from '../../content/schema';

export const COURSE_ID = 'digital-world';
/** The course map. */
export const COURSE_PATH = `/course/${COURSE_ID}`;
/** Every lesson on paper. */
export const COURSE_PRINT_PATH = `${COURSE_PATH}/print`;
/** The hidden address that turns the preview on (never linked from Our World). */
export const PREVIEW_PATH = `/preview/${COURSE_ID}`;

const lessonModules = import.meta.glob<DigitalWorldLesson>('../../../content/courses/digital-world/lessons/*.json', {
  eager: true,
  import: 'default',
});

/** No pictures are drawn yet (each lesson's visual.description says what to draw); they will go in content/courses/digital-world/visuals/. */
const pictureUrls = new Map(
  Object.entries(
    import.meta.glob<string>('../../../content/courses/digital-world/visuals/*.svg', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.replace(/^.*\/visuals\//, 'visuals/'), url]),
);

/**
 * Each section's tint and icon. The brand book has colours for Our World's
 * four sections only, and Digital World's are not decided
 * (docs/content/DIGITAL_WORLD_SPEC.md section 8), so for the preview its
 * sections use the same four tints in order, each beside its own icon and
 * name, as the brand book asks. Icons come from the design system's set.
 */
export const SECTION_LOOKS: Readonly<Record<DigitalWorldSectionId, SectionLook>> = {
  'how-ai-works': { tone: 'history', icon: 'Lightbulb' },
  'check-what-you-see': { tone: 'geography', icon: 'Eye' },
  'use-tools-wisely': { tone: 'culture', icon: 'Hand' },
  'ai-where-you-live': { tone: 'civics', icon: 'Users' },
};

const coursePath = (sectionId?: string) => (sectionId ? `${COURSE_PATH}#${sectionId}` : COURSE_PATH);

export const digitalWorld = createCourseContent(courseJson as unknown as DigitalWorldCourseFile, Object.values(lessonModules), {
  courseId: COURSE_ID,
  pictureUrls,
  // No section checks or certificates are drafted yet.
  hasSectionChecks: false,
  sectionLook: (sectionId) => SECTION_LOOKS[sectionId as DigitalWorldSectionId] ?? SECTION_LOOKS['how-ai-works'],
  // No Educators page for a preview course: a teacher guide goes back to the course map.
  coursePath,
});
