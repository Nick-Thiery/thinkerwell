/**
 * Digital World (docs/content/DIGITAL_WORLD_SPEC.md), a preview course
 * (src/content/courses.ts): the one entry to its code, loaded only by
 * src/courses/preview.tsx on a device that has turned the preview on. It
 * and everything only it uses (its lessons, activities, styles and words)
 * are one chunk in assets/preview/digital-world/, which the service worker
 * never stores and a first visit never downloads (src/courses/build.ts).
 */
// The course's pages are the shared lesson pages, print view and teacher
// guide: it depends on their chunks as wholes, so adding it doesn't split
// them into smaller files for everyone else (src/courses/build.ts).
import '../../app/lazy/lessonPages';
import '../../app/lazy/teacherPages';
import type { PreviewCourseModule } from '../types';
import { CourseMapPage } from './CourseMapPage';
import { CourseChoice, DigitalWorldFrame } from './Frame';
import { CoursePrintPage, DigitalWorldLessonPrintRoute, DigitalWorldLessonRoute, DigitalWorldTeacherGuideRoute } from './lessonPages';
import { PreviewSwitchPage } from './PreviewSwitchPage';
import { stylesheetReady } from './stylesheet';

export const course: PreviewCourseModule = {
  ready: stylesheetReady,
  CourseMapPage,
  CoursePrintPage,
  PreviewSwitchPage,
  LessonRoute: DigitalWorldLessonRoute,
  LessonPrintRoute: DigitalWorldLessonPrintRoute,
  TeacherGuideRoute: DigitalWorldTeacherGuideRoute,
  CourseChoice: ({ ourWorld, current }) => (
    <DigitalWorldFrame banner={false}>
      <CourseChoice ourWorld={ourWorld} current={current} />
    </DigitalWorldFrame>
  ),
};
