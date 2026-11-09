/**
 * The kit every preview course is built from (src/content/courses.ts):
 * its frame (its words, its English lessons), its course map, the switch
 * page at /preview/<id> (a redirect for a course every device shows), its
 * lessons in the shared lesson pages, every lesson on paper and the notes
 * for reviewers. A course's own code (src/courses/<id>/index.tsx) gives it a
 * PreviewCourseConfig and gets the pages src/courses/preview.tsx shows.
 *
 * Only preview courses' code imports it, so it is built into
 * assets/preview/ (src/courses/build.ts): never precached, never in a first
 * visit, and downloaded only when someone opens the course (or saves it for
 * offline use, src/offline/courseFiles.ts).
 */
import type { ComponentType, ReactNode } from 'react';
import { Navigate } from 'react-router';
import { findPreviewCourse } from '../../content/courses';
import type { PreviewCourseModule } from '../types';
import { PreviewCourseContext, type PreviewCourseConfig } from './course';
import { CourseMap } from './CourseMapPage';
import { PreviewCourseFrame } from './Frame';
import { PreviewAnswerKeyRoute, PreviewSectionCheckRoute } from './checkPages';
import { AllLessons, PreviewLessonPrintRoute, PreviewLessonRoute, PreviewTeacherGuideRoute } from './lessonPages';
import { PreviewSwitch } from './PreviewSwitchPage';

export type { PreviewCourseConfig } from './course';

/** A preview course's pages, from its config. `ready` resolves once its styles are on the page (./stylesheet.ts). */
export function createPreviewCourse(course: PreviewCourseConfig, ready: Promise<void>): PreviewCourseModule {
  // Pages that wrap themselves in the frame only when they show a lesson.
  const withCourse = <P extends object>(Page: ComponentType<P>): ComponentType<P> =>
    function WithCourse(props: P) {
      return (
        <PreviewCourseContext.Provider value={course}>
          <Page {...props} />
        </PreviewCourseContext.Provider>
      );
    };
  const framed = (page: ReactNode) => <PreviewCourseFrame course={course}>{page}</PreviewCourseFrame>;
  // A course every device shows has no hidden address to switch it on: /preview/<id> goes to its map.
  const open = findPreviewCourse(course.id)?.open === true;
  return {
    id: course.id,
    ready,
    CourseMapPage: () => framed(<CourseMap />),
    CoursePrintPage: () => framed(<AllLessons />),
    PreviewSwitchPage: function PreviewSwitchPage() {
      return open ? <Navigate to={course.path} replace /> : framed(<PreviewSwitch />);
    },
    LessonRoute: withCourse(PreviewLessonRoute),
    LessonPrintRoute: withCourse(PreviewLessonPrintRoute),
    TeacherGuideRoute: withCourse(PreviewTeacherGuideRoute),
    SectionCheckRoute: withCourse(PreviewSectionCheckRoute),
    AnswerKeyRoute: withCourse(PreviewAnswerKeyRoute),
  };
}
